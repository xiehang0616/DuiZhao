import json
from .config import BACKEND_DIR, env
from . import db

CONFIG_PATH = BACKEND_DIR / "config" / "models.json"


def load_models():
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        data = {}
    models = {m["id"]: m for m in data.get("models", [])}
    saved = db.get_kv("backend-settings") or {}
    models.update(saved.get("connections") or {})
    return list(models.values())


def get_model(model_id):
    return next((m for m in load_models() if m["id"] == model_id), None)


def key_for(model):
    ref = model.get("keyRef")
    if not ref:
        return ""
    # 优先读页面保存的密钥，其次读环境变量
    saved = {}
    try:
        saved = (db.get_kv("backend-settings") or {}).get("keys") or {}
        if saved.get(ref):
            return saved[ref]
    except Exception:
        pass
    if env(ref):
        return env(ref)
    fallback = model.get("fallbackKeyRef")
    if fallback:
        return saved.get(fallback) or env(fallback)
    return ""


def key_configured(model):
    return bool(key_for(model))
