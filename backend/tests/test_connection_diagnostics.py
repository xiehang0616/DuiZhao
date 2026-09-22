import asyncio
import json
import httpx
import pytest
from app import adapter, db, registry
from app.endpoints import completion_url
from app.connection_status import connection_status, record_connection_status


@pytest.mark.parametrize('address,expected', [
    ('https://api.deepseek.com', 'https://api.deepseek.com/chat/completions'),
    ('https://maas-api.antdigital.com/v1/', 'https://maas-api.antdigital.com/v1/chat/completions'),
    ('https://api.example.com/v1/chat/completions/', 'https://api.example.com/v1/chat/completions'),
])
def test_api_path_is_added_once(address, expected):
    assert completion_url(address) == expected


@pytest.mark.parametrize('address', ['https://platform.deepseek.com/api_keys', 'https://maas.antdigital.com/console/apiKey'])
def test_console_pages_rejected_before_sending_credentials(address):
    with pytest.raises(ValueError, match='控制台网页'):
        completion_url(address)


def test_complete_endpoint_stream_and_actionable_405(monkeypatch):
    original = httpx.AsyncClient
    requests = []
    response_status = [200]
    def respond(request):
        requests.append(request)
        if response_status[0] == 405:
            return httpx.Response(405, text='private upstream body')
        return httpx.Response(200, text='data: '+json.dumps({'choices':[{'delta':{'content':'正常回答'}}]})+'\n\ndata: [DONE]\n\n')
    monkeypatch.setattr(adapter.httpx, 'AsyncClient', lambda **kw: original(transport=httpx.MockTransport(respond), **kw))
    async def collect():
        return ''.join([part async for part in adapter._stream_real({'baseUrl':'https://api.example.com/v1/chat/completions','modelId':'actual-model'},'测试','', 'test-key')])
    assert asyncio.run(collect()) == '正常回答'
    assert str(requests[0].url) == 'https://api.example.com/v1/chat/completions'
    assert requests[0].method == 'POST'
    assert json.loads(requests[0].content)['model'] == 'actual-model'
    response_status[0] = 405
    with pytest.raises(RuntimeError, match='不支持 POST') as error:
        asyncio.run(collect())
    assert 'private upstream body' not in str(error.value)


def test_200_html_is_not_a_successful_model_connection(monkeypatch):
    original = httpx.AsyncClient
    monkeypatch.setattr(adapter.httpx, 'AsyncClient', lambda **kw: original(transport=httpx.MockTransport(lambda req:httpx.Response(200,text='<html>console</html>')), **kw))
    async def collect():
        return [part async for part in adapter._stream_real({'baseUrl':'https://example.com','modelId':'id'},'测试','', 'test-key')]
    with pytest.raises(RuntimeError, match='未返回有效'):
        asyncio.run(collect())


def test_connection_state_tracks_calls_and_invalidates_after_settings_change(monkeypatch):
    state = {'backend-settings':{'keys':{'TEST_KEY':'test-key'}}}
    monkeypatch.setattr(db,'get_kv',lambda k:state.get(k))
    monkeypatch.setattr(db,'set_kv',lambda k,v:state.update({k:v}))
    monkeypatch.setattr(registry,'env',lambda _: '')
    model = {'id':'diagnostics-test','keyRef':'TEST_KEY','baseUrl':'https://example.com/v1','modelId':'actual-model'}
    assert connection_status(model) == 'configured'
    record_connection_status(model, 'error')
    assert connection_status(model) == 'error'
    record_connection_status(model, 'connected')
    assert connection_status(model) == 'connected'
    assert connection_status({**model,'modelId':'changed-model'}) == 'configured'
    state['backend-settings']['keys']['TEST_KEY']='changed-key'
    assert connection_status(model) == 'configured'
    state['backend-settings']['keys']={}
    assert connection_status(model) == 'unconfigured'


def test_connection_verification_state_is_private():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    assert client.get('/api/v1/store/model-connection-status').status_code == 403
    assert client.put('/api/v1/store/model-connection-status', json={'value': {}}).status_code == 403
