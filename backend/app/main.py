import json
import time
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from .config import PORT
from .schemas import CompareRequest
from .registry import load_models, get_model, key_configured
from .adapter import stream_completion
from . import db

app = FastAPI(title="对照 DUIZHAO 后端", version="0.1.0")
db.init_db()

# 允许本地前端（8768）调用本后端（8000）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8768", "http://localhost:8768"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_TASKS = {}


def error(code, message):
    return {"error": {"code": code, "message": message}}


def sse(event, data):
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/v1/models")
def list_models():
    return [
        {
            "id": m["id"],
            "name": m["name"],
            "provider": m["provider"],
            "modelId": m["modelId"],
            "keyRef": m.get("keyRef"),
            "keyConfigured": key_configured(m),
        }
        for m in load_models()
    ]


@app.post("/api/v1/compare")
async def compare(req: CompareRequest):
    task_id = uuid.uuid4().hex
    db.create_task(task_id, req.question, req.systemPrompt, req.modelIds)
    _TASKS[task_id] = {
        "question": req.question,
        "systemPrompt": req.systemPrompt,
        "models": req.modelIds,
        "cancelled": False,
    }
    return {"taskId": task_id, "modelIds": req.modelIds}


@app.get("/api/v1/compare/{task_id}/events")
async def events(task_id: str):
    task = _TASKS.get(task_id)
    if not task:
        return JSONResponse(status_code=404, content=error("not_found", "任务不存在"))

    async def gen():
        for model_id in task["models"]:
            model = get_model(model_id)
            if not model:
                yield sse("error", {"modelId": model_id, "error": {"code": "unknown_model", "message": f"模型 {model_id} 不存在"}})
                db.save_result(task_id, model_id, "", None, None, None, f"模型 {model_id} 不存在", "error")
                continue
            collected = []
            stats = {}
            start = time.perf_counter()
            first_token_ms = None
            try:
                async for chunk in stream_completion(model, task["question"], task["systemPrompt"], stats):
                    if task.get("cancelled"):
                        yield sse("error", error("cancelled", "任务已取消"))
                        return
                    if first_token_ms is None:
                        first_token_ms = round((time.perf_counter() - start) * 1000, 1)
                    collected.append(chunk)
                    yield sse("chunk", {"modelId": model_id, "delta": chunk})
                total_ms = round((time.perf_counter() - start) * 1000, 1)
                usage = stats.get("usage")
                db.save_result(task_id, model_id, "".join(collected), first_token_ms, total_ms, usage, None, "done")
                db.set_task_status(task_id, "completed")
                yield sse(
                    "done",
                    {
                        "modelId": model_id,
                        "fullText": "".join(collected),
                        "usage": usage,
                        "firstTokenMs": first_token_ms,
                        "totalMs": total_ms,
                    },
                )
            except Exception as exc:
                total_ms = round((time.perf_counter() - start) * 1000, 1)
                db.save_result(task_id, model_id, "".join(collected), first_token_ms, total_ms, None, str(exc), "error")
                yield sse("error", {"modelId": model_id, "error": {"code": "upstream_error", "message": str(exc)}})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/v1/compare/{task_id}/cancel")
async def cancel(task_id: str):
    task = _TASKS.get(task_id)
    if not task:
        return JSONResponse(status_code=404, content=error("not_found", "任务不存在"))
    task["cancelled"] = True
    db.set_task_status(task_id, "cancelled")
    return {"status": "cancelled"}


@app.get("/api/v1/compare/{task_id}")
async def get_task(task_id: str):
    data = db.get_task(task_id)
    if not data:
        return JSONResponse(status_code=404, content=error("not_found", "任务不存在"))
    return data


@app.get("/api/v1/store/{key}")
async def get_store(key: str):
    data = db.get_kv(key)
    if data is None:
        return JSONResponse(status_code=404, content=error("not_found", "键不存在"))
    return {"key": key, "value": data}


@app.put("/api/v1/store/{key}")
async def put_store(key: str, body: dict):
    db.set_kv(key, body.get("value"))
    return {"ok": True}


@app.get("/api/v1/settings")
async def get_settings():
    keys = {}
    for m in load_models():
        ref = m.get("keyRef")
        if ref:
            keys[ref] = key_configured(m)
    return {"keys": keys}


@app.put("/api/v1/settings")
async def put_settings(body: dict):
    incoming = body.get("keys") or {}
    data = db.get_kv("backend-settings") or {}
    merged = dict(data.get("keys") or {})
    for k, v in incoming.items():
        if v:
            merged[k] = str(v)
        else:
            merged.pop(k, None)
    db.set_kv("backend-settings", {"keys": merged})
    return {"ok": True, "configured": {k: bool(v) for k, v in merged.items()}}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=PORT, reload=True)
