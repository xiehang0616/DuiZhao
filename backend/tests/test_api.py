from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_models():
    r = client.get("/api/v1/models")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert all("keyConfigured" in m for m in r.json())


def test_compare_streams_done():
    r = client.post("/api/v1/compare", json={"question": "测试问题", "modelIds": ["qwen-plus"]})
    assert r.status_code == 200
    task_id = r.json()["taskId"]
    with client.stream("GET", f"/api/v1/compare/{task_id}/events") as resp:
        body = "".join(resp.iter_text())
    assert "event: done" in body


def test_unknown_model_errors():
    r = client.post("/api/v1/compare", json={"question": "测试", "modelIds": ["nope"]})
    task_id = r.json()["taskId"]
    with client.stream("GET", f"/api/v1/compare/{task_id}/events") as resp:
        body = "".join(resp.iter_text())
    assert "event: error" in body


def test_persistence_and_timing():
    r = client.post("/api/v1/compare", json={"question": "持久化测试", "modelIds": ["qwen-plus"]})
    task_id = r.json()["taskId"]
    with client.stream("GET", f"/api/v1/compare/{task_id}/events") as resp:
        body = "".join(resp.iter_text())
    assert "event: done" in body
    data = client.get(f"/api/v1/compare/{task_id}").json()
    assert data["taskId"] == task_id
    assert data["status"] == "completed"
    assert data["results"][0]["modelId"] == "qwen-plus"
    assert data["results"][0]["fullText"]
    assert isinstance(data["results"][0]["firstTokenMs"], (int, float))
    assert isinstance(data["results"][0]["totalMs"], (int, float))
