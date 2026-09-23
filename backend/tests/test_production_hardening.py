import asyncio
import base64
import httpx
from fastapi.testclient import TestClient
from app import adapter, media, main

client = TestClient(main.app)


def test_post_json_retries_on_429_then_succeeds(monkeypatch):
    original = httpx.AsyncClient
    attempts = [0]

    def respond(request):
        attempts[0] += 1
        if attempts[0] == 1:
            return httpx.Response(429, json={"error": {"message": "rate limited"}})
        return httpx.Response(200, json={"ok": True})

    monkeypatch.setattr(adapter.httpx, "AsyncClient", lambda **kw: original(transport=httpx.MockTransport(respond), **kw))
    resp = asyncio.run(adapter._post_json("https://example.com/v1", {}, {"model": "x"}, timeout=5))
    assert resp.status_code == 200
    assert attempts[0] == 2


def test_persist_media_b64_writes_stable_file(tmp_path, monkeypatch):
    monkeypatch.setattr(media, "MEDIA_DIR", tmp_path)
    png = base64.b64encode(b"fake-image-bytes").decode()
    result = asyncio.run(media.persist_media({"type": "image", "b64": png}))
    assert result["url"].startswith("/api/v1/media/")
    filename = result["url"].split("/")[-1]
    assert (tmp_path / filename).read_bytes() == b"fake-image-bytes"
    assert "b64" not in result


def test_media_serve_endpoint(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "MEDIA_DIR", tmp_path)
    (tmp_path / "abc.png").write_bytes(b"png-data")
    r = client.get("/api/v1/media/abc.png")
    assert r.status_code == 200
    assert r.content == b"png-data"
    assert client.get("/api/v1/media/missing.png").status_code == 404


def test_media_serve_rejects_traversal(monkeypatch, tmp_path):
    monkeypatch.setattr(main, "MEDIA_DIR", tmp_path)
    assert client.get("/api/v1/media/a%2Fb.png").status_code in (400, 404, 422)


def test_image_resolution_schema_validation():
    assert client.post("/api/v1/compare", json={"question": "x", "modelIds": ["qwen3.8-flash"], "imageResolution": "8K"}).status_code == 422
    assert client.post("/api/v1/compare", json={"question": "x", "modelIds": ["qwen3.8-flash"], "imageResolution": "4K"}).status_code == 200
