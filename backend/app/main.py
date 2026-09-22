import json
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from .config import PORT
from .schemas import CompareRequest
from .registry import load_models, get_model, key_configured
from .adapter import stream_completion

app = FastAPI(title="对照 DUIZHAO 后端", version="0.1.0")

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
            "keyConfigured": key_configured(m),
        }
        for m in load_models()
    ]


@app.post("/api/v1/compare")
async def compare(req: CompareRequest):
    task_id = uuid.uuid4().hex
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
                yield sse("error", error("unknown_model", f"模型 {model_id} 不存在"))
                continue
            collected = []
            try:
                async for chunk in stream_completion(model, task["question"], task["systemPrompt"]):
                    if task.get("cancelled"):
                        yield sse("error", error("cancelled", "任务已取消"))
                        return
                    collected.append(chunk)
                    yield sse("chunk", {"modelId": model_id, "delta": chunk})
                yield sse(
                    "done",
                    {
                        "modelId": model_id,
                        "fullText": "".join(collected),
                        "usage": None,
                        "firstTokenMs": None,
                        "totalMs": None,
                    },
                )
            except Exception as exc:
                yield sse("error", error("upstream_error", str(exc)))

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
    return {"status": "cancelled"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=PORT, reload=True)
