import asyncio
import json as _json
import httpx
from .registry import key_for

MOCK_TEXT = (
    "这是预置示例回答（未接入真实模型，不代表真实能力）。\n"
    "针对该问题，建议从三方面考虑：\n"
    "1. 正常流程：明确主路径、状态与反馈。\n"
    "2. 异常情况：覆盖重复提交、超时与失败恢复。\n"
    "3. 验收标准：给出可逐项检查的条目。\n"
    "——以上为演示内容。"
)


async def stream_completion(model, question, system_prompt, stats=None):
    """逐段产出文本；无 Key 时走 mock，有 Key 时走真实 OpenAI 兼容接口。stats 用于回填 usage。"""
    key = key_for(model)
    if stats is not None:
        stats["source"] = "api" if key else "demo"
    if key:
        async for chunk in _stream_real(model, question, system_prompt, key, stats):
            yield chunk
    else:
        async for chunk in _stream_mock(model):
            yield chunk


async def _stream_mock(model):
    text = f"【{model.get('name', '模型')}】\n" + MOCK_TEXT
    for i in range(0, len(text), 10):
        await asyncio.sleep(0.05)
        yield text[i : i + 10]


async def _stream_real(model, question, system_prompt, key, stats=None):
    base_url = model.get("baseUrl", "").rstrip("/")
    url = f"{base_url}/chat/completions"
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    payload = {
        "model": model.get("modelId"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        "stream": True,
        "stream_options": {"include_usage": True},
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            if resp.status_code != 200:
                body = (await resp.aread()).decode("utf-8", "ignore")[:200]
                raise RuntimeError(f"上游返回 {resp.status_code}: {body}")
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
                        yield delta
                except Exception:
                    continue
