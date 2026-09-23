import asyncio
import json
import time
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from .config import PORT, BACKEND_DIR
from .schemas import CompareRequest, SettingsRequest
from .registry import load_models, get_model, key_configured
from .adapter import stream_completion, test_model_connection, generate_image, submit_video, query_video, model_kind
from . import db
from .connection_status import connection_status, record_connection_status

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


STATIC_DIR = BACKEND_DIR / "static"


@app.get("/")
@app.get("/arena.html")
@app.get("/index.html")
async def serve_arena():
    return FileResponse(STATIC_DIR / "arena.html")


@app.get("/loading-demo.html")
async def serve_loading_demo():
    return FileResponse(STATIC_DIR / "loading-demo.html")


@app.get("/api/v1/models")
def list_models():
    return [
        {
            "id": m["id"],
            "name": m["name"],
            "provider": m["provider"],
            "modelId": m["modelId"],
            "keyRef": m.get("keyRef"),
            "baseUrl": m.get("baseUrl", ""),
            "connectionName": m.get("connectionName", ""),
            "keyConfigured": key_configured(m),
            "connectionStatus": connection_status(m),
        }
        for m in load_models()
    ]


@app.post("/api/v1/connections/{model_id}/test")
async def test_connection(model_id: str):
    model = get_model(model_id)
    if not model:
        return JSONResponse(status_code=404, content=error("not_found", "模型不存在"))
    if not key_configured(model):
        return {"status": "unconfigured", "reason": "未配置 API Key"}
    kind = model_kind(model)
    if kind in ("image", "video"):
        return {"status": "skipped", "reason": "该模型为%s生成模型，请在对应模式发送一次真实生成来验证连通性。" % ("视频" if kind == "video" else "图片")}
    try:
        await test_model_connection(model)
        record_connection_status(model, "connected")
        return {"status": "connected"}
    except Exception as exc:
        record_connection_status(model, "error")
        return {"status": "error", "reason": str(exc)}


@app.post("/api/v1/compare")
async def compare(req: CompareRequest):
    task_id = uuid.uuid4().hex
    db.create_task(task_id, req.question, req.systemPrompt, req.modelIds)
    _TASKS[task_id] = {
        "question": req.question,
        "systemPrompt": req.systemPrompt,
        "models": req.modelIds,
        "modality": req.modality,
        "videoResolution": req.videoResolution,
        "videoDuration": req.videoDuration,
        "images": req.images,
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
            model = None
            modality = task.get("modality", "text")
            try:
                if task.get("cancelled"):
                    raise asyncio.CancelledError()
                model = get_model(model_id)
                if not model:
                    raise ValueError(f"模型 {model_id} 不存在")

                if modality == "image":
                    media = await generate_image(model, task["question"])
                    total_ms = round((time.perf_counter() - start) * 1000, 1)
                    record_connection_status(model, "connected")
                    db.save_result(task_id, model_id, json.dumps(media, ensure_ascii=False), None, total_ms, None, None, "done")
                    outcomes[model_id] = "done"
                    await queue.put(("done", {"modelId": model_id, "media": media, "source": "api", "totalMs": total_ms}))
                    return

                if modality == "video":
                    first_image = (task.get("images") or [None])[0]
                    video_task_id = await submit_video(model, task["question"], task.get("videoResolution", "720P"), task.get("videoDuration", 5), first_image)
                    while True:
                        if task.get("cancelled"):
                            raise asyncio.CancelledError()
                        status, video_url = await query_video(model, video_task_id)
                        if status in ("SUCCEEDED", "SUCCESS"):
                            if not video_url:
                                raise RuntimeError("视频任务完成，但未返回视频地址。")
                            media = {"type": "video", "url": video_url}
                            total_ms = round((time.perf_counter() - start) * 1000, 1)
                            record_connection_status(model, "connected")
                            db.save_result(task_id, model_id, json.dumps(media, ensure_ascii=False), None, total_ms, None, None, "done")
                            outcomes[model_id] = "done"
                            await queue.put(("done", {"modelId": model_id, "media": media, "source": "api", "totalMs": total_ms}))
                            return
                        if status in ("FAILED", "CANCELED", "CANCELLED", "UNKNOWN"):
                            raise RuntimeError("视频生成失败（任务状态：" + status + "）")
                        await asyncio.sleep(3)

                async for chunk in stream_completion(model, task["question"], task["systemPrompt"], stats, task.get("images")):
                    if first_token_ms is None:
                        first_token_ms = round((time.perf_counter() - start) * 1000, 1)
                    collected.append(chunk)
                    await queue.put(("chunk", {"modelId": model_id, "delta": chunk}))
                total_ms = round((time.perf_counter() - start) * 1000, 1)
                full_text = "".join(collected)
                if stats.get("source") == "api":
                    record_connection_status(model, "connected")
                db.save_result(task_id, model_id, full_text, first_token_ms, total_ms, stats.get("usage"), None, "done")
                outcomes[model_id] = "done"
                await queue.put(("done", {"modelId": model_id, "fullText": full_text, "usage": stats.get("usage"), "firstTokenMs": first_token_ms, "totalMs": total_ms, "source": stats.get("source")}))
            except asyncio.CancelledError:
                outcomes[model_id] = "cancelled"
                db.save_result(task_id, model_id, "".join(collected), first_token_ms, round((time.perf_counter()-start)*1000, 1), stats.get("usage"), "任务已取消", "cancelled")
                await queue.put(("error", {"modelId": model_id, "error": {"code": "cancelled", "message": "任务已取消"}}))
                raise
            except Exception as exc:
                if model and stats.get("source") == "api":
                    record_connection_status(model, "error")
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
    if key in {"backend-settings", "model-connection-status"}:
        return JSONResponse(status_code=403, content=error("private", "私有设置不可直接读取"))
    data = db.get_kv(key)
    if data is None:
        return JSONResponse(status_code=404, content=error("not_found", "键不存在"))
    return {"key": key, "value": data}


@app.put("/api/v1/store/{key}")
async def put_store(key: str, body: dict):
    if key in {"backend-settings", "model-connection-status"}:
        return JSONResponse(status_code=403, content=error("private", "私有设置不可直接写入"))
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
async def put_settings(body: SettingsRequest):
    incoming = body.keys
    data = db.get_kv("backend-settings") or {}
    merged = dict(data.get("keys") or {})
    for k, v in incoming.items():
        if v:
            merged[k] = str(v)
        else:
            merged.pop(k, None)
    connections = dict(data.get("connections") or {})
    available = {m["id"]: m for m in load_models()}
    for item in body.connections:
        previous = connections.get(item.id, {})
        source = available.get(item.inheritFrom, {})
        ref = "MODEL_" + item.id
        connection = {
            "id": item.id, "name": item.name, "provider": item.provider,
            "modelId": item.modelId, "baseUrl": item.baseUrl,
            "connectionName": item.connectionName, "keyRef": ref,
            "fallbackKeyRef": previous.get("fallbackKeyRef") or source.get("keyRef"),
        }
        if item.apiKey and item.apiKey.strip():
            merged[ref] = item.apiKey.strip()
        connections[item.id] = connection
    db.set_kv("backend-settings", {**data, "keys": merged, "connections": connections})
    return {"ok": True, "configured": {k: bool(v) for k, v in merged.items()}, "connectionIds": [item.id for item in body.connections]}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=PORT, reload=True)
