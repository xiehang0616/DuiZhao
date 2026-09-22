import json
from .config import BACKEND_DIR, env
from . import db

CONFIG_PATH = BACKEND_DIR / "config" / "models.json"


def load_models():
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    return data.get("models", [])


def get_model(model_id):
    return next((m for m in load_models() if m["id"] == model_id), None)


def key_for(model):
    ref = model.get("keyRef")
    if not ref:
        return ""
    # 优先读页面保存的密钥，其次读环境变量
    try:
        saved = (db.get_kv("backend-settings") or {}).get("keys") or {}
        if saved.get(ref):
            return saved[ref]
    except Exception:
        pass
    return env(ref)


def key_configured(model):
    return bool(key_for(model))
