"""媒体落盘与代理：把上游返回的带签名临时 URL（约 1 天过期）下载为本地文件，
通过稳定的 /api/v1/media/<文件名> 地址重新暴露，避免旧对话重看时媒体失效。"""
import base64
import hashlib
import httpx
from .config import MEDIA_DIR

PUBLIC_PREFIX = "/api/v1/media/"


def _ext(media):
    return ".mp4" if media.get("type") == "video" else ".png"


def _save(data, ext):
    digest = hashlib.sha256(data).hexdigest()[:24]
    filename = f"{digest}{ext}"
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    (MEDIA_DIR / filename).write_bytes(data)
    return PUBLIC_PREFIX + filename


async def _persist_url(url, ext):
    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            raise RuntimeError(f"下载媒体失败（{resp.status_code}）")
        return _save(resp.content, ext)


async def persist_media(media):
    """把 media（url / urls / b64）落盘并替换为稳定路径；失败时原样返回（保留临时 URL 兜底）。"""
    if not isinstance(media, dict):
        return media
    try:
        result = dict(media)
        ext = _ext(media)
        if media.get("urls"):
            result["urls"] = [await _persist_url(u, ext) for u in media["urls"]]
            result["url"] = result["urls"][0]
        elif media.get("url"):
            result["url"] = await _persist_url(media["url"], ext)
        elif media.get("b64"):
            result["url"] = _save(base64.b64decode(media["b64"]), ext)
            result.pop("b64", None)
            result.pop("b64s", None)
        return result
    except Exception:
        return media
