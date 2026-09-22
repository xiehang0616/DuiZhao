from fastapi.testclient import TestClient
from app.main import app
from app import db, registry

client = TestClient(app)


def connection(id, **changes):
    return {"id": f"connection:{id}", "name": id, "modelId": "same-api-id", "provider": "测试", "connectionName": f"{id}连接", "baseUrl": f"https://{id}.example/v1", **changes}


def test_independent_connections_and_private_keys(monkeypatch):
    state = {}
    monkeypatch.setattr(db, 'get_kv', lambda key: state.get(key))
    monkeypatch.setattr(db, 'set_kv', lambda key, value: state.update({key: value}))
    monkeypatch.setattr(registry, 'env', lambda name: '')
    response = client.put('/api/v1/settings', json={'connections': [connection('one', apiKey='secret-one'), connection('two', apiKey='secret-two')]})
    assert response.status_code == 200
    one, two = registry.get_model('connection:one'), registry.get_model('connection:two')
    assert one['baseUrl'] != two['baseUrl']
    assert one['modelId'] == two['modelId']
    assert registry.key_for(one) == 'secret-one'
    assert registry.key_for(two) == 'secret-two'
    response = client.put('/api/v1/settings', json={'connections': [connection('one', connectionName='修改名称', baseUrl='https://new.example/v1', apiKey='')]})
    assert response.status_code == 200
    assert registry.key_for(registry.get_model('connection:one')) == 'secret-one'
    assert registry.key_for(registry.get_model('connection:two')) == 'secret-two'
    assert registry.get_model('connection:one')['baseUrl'] == 'https://new.example/v1'
    for path in ['/api/v1/models', '/api/v1/settings']:
        assert 'secret-one' not in client.get(path).text
        assert 'secret-two' not in client.get(path).text
    assert client.get('/api/v1/store/backend-settings').status_code == 403
    assert client.put('/api/v1/store/backend-settings', json={'value': {}}).status_code == 403


def test_existing_provider_key_can_be_inherited_without_overwriting_it(monkeypatch):
    state = {'backend-settings': {'keys': {'KEY_ANT': 'legacy-secret'}}}
    monkeypatch.setattr(db, 'get_kv', lambda key: state.get(key))
    monkeypatch.setattr(db, 'set_kv', lambda key, value: state.update({key: value}))
    assert client.put('/api/v1/settings', json={'connections': [connection('one', inheritFrom='qwen3.8-flash')]}).status_code == 200
    assert registry.key_for(registry.get_model('connection:one')) == 'legacy-secret'
    client.put('/api/v1/settings', json={'connections': [connection('one', apiKey='own-secret')]})
    assert registry.key_for(registry.get_model('connection:one')) == 'own-secret'
    assert state['backend-settings']['keys']['KEY_ANT'] == 'legacy-secret'


def test_invalid_connections_are_rejected_before_any_save(monkeypatch):
    monkeypatch.setattr(db, 'set_kv', lambda *args: (_ for _ in ()).throw(AssertionError('must not save')))
    for url in ['file:///tmp/key', 'https://user:password@example.com/v1', 'javascript:alert(1)']:
        assert client.put('/api/v1/settings', json={'connections': [connection('one', baseUrl=url)]}).status_code == 422


def test_compare_resolves_each_saved_connection(monkeypatch):
    from app import main
    state = {}
    monkeypatch.setattr(db, 'get_kv', lambda key: state.get(key))
    monkeypatch.setattr(db, 'set_kv', lambda key, value: state.update({key: value}))
    called = []
    async def fake_stream(model, question, prompt, stats):
        called.append((model['id'], model['baseUrl'], model['modelId']))
        yield '测试回答'
    monkeypatch.setattr(main, 'stream_completion', fake_stream)
    client.put('/api/v1/settings', json={'connections': [connection('one'), connection('two')]})
    task = client.post('/api/v1/compare', json={'question':'验证连接路由', 'modelIds':['connection:one','connection:two']}).json()
    assert 'event: done' in client.get(f"/api/v1/compare/{task['taskId']}/events").text
    assert sorted(called) == [('connection:one','https://one.example/v1','same-api-id'),('connection:two','https://two.example/v1','same-api-id')]
