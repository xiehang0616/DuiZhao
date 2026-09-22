import json
from .config import BACKEND_DIR, env

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
    return env(ref) if ref else ""


def key_configured(model):
    return bool(key_for(model))
