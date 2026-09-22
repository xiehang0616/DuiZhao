import asyncio
import json
from fastapi.testclient import TestClient
from app import main

client = TestClient(main.app)

def parse(body):
    return [(part.splitlines()[0][7:], json.loads(part.splitlines()[1][6:])) for part in body.strip().split('\n\n')]

def test_models_start_in_parallel_and_finish_independently(monkeypatch):
    started = set()
    async def fake(model, question, prompt, stats):
        started.add(model['id'])
        for _ in range(20):
            if len(started) == 2:
                break
            await asyncio.sleep(.001)
        assert len(started) == 2, 'models were invoked serially'
        yield '## ' + model['id']
        await asyncio.sleep(.03 if model['id'] == 'qwen-plus' else .001)
        yield '完成'
    monkeypatch.setattr(main, 'stream_completion', fake)
    tid = client.post('/api/v1/compare', json={'question':'并行', 'modelIds':['qwen-plus','deepseek-v3']}).json()['taskId']
    events = parse(client.get(f'/api/v1/compare/{tid}/events').text)
    first_done = next(i for i,e in enumerate(events) if e[0] == 'done')
    assert {e[1]['modelId'] for e in events[:first_done] if e[0] == 'chunk'} == {'qwen-plus','deepseek-v3'}
    assert events[first_done][1]['modelId'] == 'deepseek-v3'
    assert client.get(f'/api/v1/compare/{tid}').json()['status'] == 'completed'

def test_failure_does_not_discard_peer_or_partial_text(monkeypatch):
    async def fake(model, question, prompt, stats):
        yield '已收到'
        if model['id'] == 'qwen-plus':
            raise RuntimeError('测试失败')
        yield '成功'
    monkeypatch.setattr(main, 'stream_completion', fake)
    tid = client.post('/api/v1/compare', json={'question':'错误隔离', 'modelIds':['qwen-plus','deepseek-v3']}).json()['taskId']
    events = parse(client.get(f'/api/v1/compare/{tid}/events').text)
    assert any(e == 'done' and d['modelId'] == 'deepseek-v3' for e,d in events)
    results = {r['modelId']:r for r in client.get(f'/api/v1/compare/{tid}').json()['results']}
    assert results['qwen-plus']['fullText'] == '已收到'
    assert results['deepseek-v3']['status'] == 'done'

def test_cancel_interrupts_waiting_providers_and_saves_partial_text(monkeypatch):
    async def fake(model, question, prompt, stats):
        yield '已收到'
        await asyncio.sleep(60)
        yield '不应出现'
    monkeypatch.setattr(main, 'stream_completion', fake)
    async def run():
        req = main.CompareRequest(question='取消', modelIds=['qwen-plus','deepseek-v3'])
        tid = (await main.compare(req))['taskId']
        response = await main.events(tid)
        iterator = response.body_iterator
        first = await anext(iterator)
        assert '已收到' in first
        await main.cancel(tid)
        rest = []
        async for event in iterator:
            rest.append(event)
        assert '不应出现' not in ''.join(rest)
        assert not main._TASKS[tid].get('workers')
        assert main.db.get_task(tid)['status'] == 'cancelled'
    async def timed():
        await asyncio.wait_for(run(), timeout=2)
    asyncio.run(timed())
