import asyncio
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
        # Each producer runs independently; a slow model never blocks another card.
        queue = asyncio.Queue()
        outcomes = {}

        async def produce(model_id):
            collected, stats = [], {}
            start = time.perf_counter()
            first_token_ms = None
            try:
                if task.get("cancelled"):
                    raise asyncio.CancelledError()
                model = get_model(model_id)
                if not model:
                    raise ValueError(f"模型 {model_id} 不存在")
                async for chunk in stream_completion(model, task["question"], task["systemPrompt"], stats):
                    if first_token_ms is None:
                        first_token_ms = round((time.perf_counter() - start) * 1000, 1)
                    collected.append(chunk)
                    await queue.put(("chunk", {"modelId": model_id, "delta": chunk}))
                total_ms = round((time.perf_counter() - start) * 1000, 1)
                full_text = "".join(collected)
                db.save_result(task_id, model_id, full_text, first_token_ms, total_ms, stats.get("usage"), None, "done")
                outcomes[model_id] = "done"
                await queue.put(("done", {"modelId": model_id, "fullText": full_text, "usage": stats.get("usage"), "firstTokenMs": first_token_ms, "totalMs": total_ms, "source": stats.get("source")}))
            except asyncio.CancelledError:
                outcomes[model_id] = "cancelled"
                db.save_result(task_id, model_id, "".join(collected), first_token_ms, round((time.perf_counter()-start)*1000, 1), stats.get("usage"), "任务已取消", "cancelled")
                await queue.put(("error", {"modelId": model_id, "error": {"code": "cancelled", "message": "任务已取消"}}))
                raise
            except Exception as exc:
                outcomes[model_id] = "error"
                db.save_result(task_id, model_id, "".join(collected), first_token_ms, round((time.perf_counter()-start)*1000, 1), stats.get("usage"), str(exc), "error")
                await queue.put(("error", {"modelId": model_id, "error": {"code": "upstream_error", "message": str(exc)}}))
            finally:
                queue.put_nowait((None, None))

        workers = [asyncio.create_task(produce(model_id)) for model_id in task["models"]]
        task["workers"] = workers
        remaining = len(workers)
        try:
            while remaining:
                event, data = await queue.get()
                if event is None:
                    remaining -= 1
                else:
                    yield sse(event, data)
            db.set_task_status(task_id, "cancelled" if task.get("cancelled") else "completed" if all(v == "done" for v in outcomes.values()) else "failed")
        finally:
            unfinished = any(not worker.done() for worker in workers)
            for worker in workers:
                if not worker.done():
                    worker.cancel()
            await asyncio.gather(*workers, return_exceptions=True)
            task.pop("workers", None)
            if unfinished:
                task["cancelled"] = True
                db.set_task_status(task_id, "cancelled")

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
    for worker in task.get("workers", []):
        worker.cancel()
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
