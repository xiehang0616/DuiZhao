import asyncio
import json as _json
import httpx
from .endpoints import completion_url, image_generation_url, video_synthesis_url, task_url
from .registry import key_for

MOCK_TEXT = (
    "这是预置示例回答（未接入真实模型，不代表真实能力）。\n"
    "针对该问题，建议从三方面考虑：\n"
    "1. 正常流程：明确主路径、状态与反馈。\n"
    "2. 异常情况：覆盖重复提交、超时与失败恢复。\n"
    "3. 验收标准：给出可逐项检查的条目。\n"
    "——以上为演示内容。"
)


async def stream_completion(model, question, system_prompt, stats=None, images=None):
    """逐段产出文本；无 Key 时走 mock，有 Key 时走真实 OpenAI 兼容接口。images 为图片 data URL，用于多模态理解。"""
    key = key_for(model)
    if stats is not None:
        stats["source"] = "api" if key else "demo"
    if key:
        async for chunk in _stream_real(model, question, system_prompt, key, stats, images):
            yield chunk
    else:
        async for chunk in _stream_mock(model):
            yield chunk


async def _stream_mock(model):
    text = f"【{model.get('name', '模型')}】\n" + MOCK_TEXT
    for i in range(0, len(text), 10):
        await asyncio.sleep(0.05)
        yield text[i : i + 10]




def upstream_error(status):
    hints = {
        400: '请检查模型 ID 和请求参数，模型 ID 应填写服务商提供的接口标识。',
        401: 'API Key 无效或已过期，请检查对应模型的密钥。',
        403: '当前密钥无权调用此模型，请检查模型权限。',
        404: '请检查服务地址和模型 ID，接口或模型不存在。',
        405: '当前地址不支持 POST，请检查服务地址是否为模型 API，而不是网页或控制台地址。支持填写 API 基础地址或完整的 /chat/completions 地址。',
        429: '调用频率或额度受限，请检查余额和限额后重试。',
    }
    return f"上游返回 {status}：" + hints.get(status, '模型服务暂时不可用，请稍后重试。')


def upstream_message(resp):
    """从上游错误响应体提取可读信息；模型未开通时给出可操作提示。"""
    try:
        data = resp.json()
        err = data.get("error") or {}
        code = err.get("code") or err.get("type") or ""
        msg = err.get("message") or code or ""
        if code in ("project_model_unavailable", "model_not_allowed", "model_unavailable", "model_not_found", "model_not_exist"):
            return "该模型未开通或无调用权限，请先在蚂蚁 MaaS 控制台开通该模型。"
        if msg:
            return f"上游返回：{msg}"
    except Exception:
        pass
    return upstream_error(resp.status_code)


def model_kind(model):
    """根据模型 ID/名称推断生成类型：video / image / text。"""
    mid = (model.get('modelId') or '').lower()
    name = (model.get('name') or '').lower()
    if any(k in mid for k in ('t2v', 'i2v', 'r2v', 'video', 't2a', 'i2a')) or '视频' in name:
        return 'video'
    if any(k in mid for k in ('t2i', 'i2i', 'image', 'seedream', 'cogview', 'kolors')) or '图像' in name or '文生图' in name or '图生图' in name:
        return 'image'
    return 'text'


async def test_model_connection(model):
    """发起一次最小真实调用（1 token），成功返回 True，失败抛可读异常。"""
    key = key_for(model)
    if not key:
        raise RuntimeError('未配置 API Key，请先在模型配置里填写密钥。')
    url = completion_url(model.get('baseUrl', ''))
    headers = {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    payload = {
        'model': model.get('modelId'),
        'messages': [{'role': 'user', 'content': 'hi'}],
        'max_tokens': 1,
        'stream': False,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(upstream_error(resp.status_code))
            return True
    except httpx.TimeoutException:
        raise RuntimeError('连接超时，请检查服务地址和网络。')
    except httpx.ConnectError:
        raise RuntimeError('无法连接服务地址，请检查地址是否正确。')


async def _stream_real(model, question, system_prompt, key, stats=None, images=None):
    url = completion_url(model.get("baseUrl", ""))
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    user_content = question
    if images:
        user_content = [{"type": "text", "text": question}] + [{"type": "image_url", "image_url": {"url": img}} for img in images]
    payload = {
        "model": model.get("modelId"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "stream": True,
        "stream_options": {"include_usage": True},
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            if resp.status_code != 200:
                raise RuntimeError(upstream_error(resp.status_code))
            received_content = False
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    obj = _json.loads(data)
                    if obj.get("usage") and stats is not None:
                        stats["usage"] = obj["usage"]
                    delta = obj["choices"][0]["delta"].get("content")
                    if delta:
                        received_content = True
                        yield delta
                except Exception:
                    continue

            if not received_content:
                raise RuntimeError('接口未返回有效的流式回答，请检查服务地址、模型 ID 及 OpenAI Chat Completions 兼容性。')


async def generate_image(model, prompt):
    """同步生成一张图片，返回 {'type':'image','url':...} 或 {'type':'image','b64':...}。"""
    key = key_for(model)
    if not key:
        raise RuntimeError('未配置 API Key，请先在模型配置里填写密钥。')
    url = image_generation_url(model.get('baseUrl', ''))
    headers = {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    payload = {'model': model.get('modelId'), 'prompt': prompt, 'size': '1024x1024', 'response_format': 'url'}
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(upstream_message(resp))
            data = resp.json()
            items = data.get('data') or []
            urls = [it.get('url') for it in items if it.get('url')]
            b64s = [it.get('b64_json') for it in items if it.get('b64_json')]
            if urls:
                return {'type': 'image', 'url': urls[0], 'urls': urls, 'size': payload['size']}
            if b64s:
                return {'type': 'image', 'b64': b64s[0], 'b64s': b64s, 'size': payload['size']}
            raise RuntimeError('图片接口未返回图片内容，请检查模型 ID 是否支持图片生成。')
    except httpx.TimeoutException:
        raise RuntimeError('图片生成超时，请稍后重试。')
    except httpx.ConnectError:
        raise RuntimeError('无法连接服务地址，请检查地址是否正确。')


async def submit_video(model, prompt, resolution="720P", duration=5, image=None):
    """提交视频生成任务，返回任务 ID。image 为首帧参考图（data URL 或公网 URL），用于图生视频。"""
    key = key_for(model)
    if not key:
        raise RuntimeError('未配置 API Key，请先在模型配置里填写密钥。')
    url = video_synthesis_url(model.get('baseUrl', ''))
    headers = {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json', 'X-DashScope-Async': 'enable'}
    input_data = {'prompt': prompt}
    if image:
        input_data['media'] = [{'type': 'first_frame', 'url': image}]
    payload = {'model': model.get('modelId'), 'input': input_data, 'parameters': {'resolution': resolution, 'duration': duration}}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(upstream_message(resp))
            data = resp.json()
            task_id = (data.get('output') or {}).get('task_id')
            if not task_id:
                raise RuntimeError('视频任务提交失败：未返回任务 ID。')
            return task_id
    except httpx.TimeoutException:
        raise RuntimeError('视频任务提交超时，请稍后重试。')
    except httpx.ConnectError:
        raise RuntimeError('无法连接服务地址，请检查地址是否正确。')


async def query_video(model, task_id):
    """查询视频任务状态，返回 (task_status, video_url)。"""
    key = key_for(model)
    url = task_url(model.get('baseUrl', ''), task_id)
    headers = {'Authorization': f'Bearer {key}'}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            raise RuntimeError(upstream_message(resp))
        data = resp.json()
        output = data.get('output') or {}
        status = output.get('task_status') or output.get('status') or ''
        video_url = output.get('video_url') or (output.get('results') or {}).get('video_url')
        return status, video_url
