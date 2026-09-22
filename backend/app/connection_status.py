import hashlib
import json
from . import db
from .registry import key_for


def signature(model):
    data = [model.get('baseUrl'), model.get('modelId'), key_for(model)]
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()


def connection_status(model):
    if not key_for(model):
        return 'unconfigured'
    saved = (db.get_kv('model-connection-status') or {}).get(model['id'])
    if saved and saved.get('signature') == signature(model):
        return saved['status']
    return 'configured'


def record_connection_status(model, status):
    saved = db.get_kv('model-connection-status') or {}
    saved[model['id']] = {'signature': signature(model), 'status': status}
    db.set_kv('model-connection-status', saved)
