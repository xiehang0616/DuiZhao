import json
import shutil
import sqlite3
from pathlib import Path
from .config import BACKEND_DIR, env, PERSIST_DIR


def _db_path():
    url = env("DATABASE_URL")
    if url and url.startswith("sqlite:///"):
        path = url[len("sqlite:///"):]
        return Path(path) if path.startswith("/") else BACKEND_DIR / path
    return BACKEND_DIR / "data" / "duizhao.db"


DB_PATH = _db_path()


def _conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _snapshot_path():
    """返回持久化快照路径；未配置 PERSIST_DIR（TOS 挂载点）时为 None，不启用快照备份。"""
    if not PERSIST_DIR:
        return None
    return PERSIST_DIR / "duizhao.db"


def restore_db():
    """新实例启动时，从持久化目录恢复上次快照（/tmp 的 SQLite 随实例回收丢失）。"""
    target = _snapshot_path()
    if not target or not target.exists():
        return
    if DB_PATH.exists() and DB_PATH.stat().st_size > 0:
        return
    try:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        DB_PATH.write_bytes(target.read_bytes())
    except Exception:
        pass


def snapshot_db():
    """把当前 SQLite 落成一致快照到持久化目录；失败静默（不影响本次请求）。"""
    target = _snapshot_path()
    if not target:
        return
    try:
        conn = _conn()
        try:
            conn.execute("PRAGMA wal_checkpoint(FULL)")
        finally:
            conn.close()
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(DB_PATH, target)
    except Exception:
        pass


def init_db():
    restore_db()
    conn = _conn()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                question TEXT NOT NULL,
                system_prompt TEXT DEFAULT '',
                model_ids TEXT NOT NULL,
                status TEXT DEFAULT 'running',
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS results (
                task_id TEXT NOT NULL,
                model_id TEXT NOT NULL,
                full_text TEXT DEFAULT '',
                first_token_ms REAL,
                total_ms REAL,
                usage TEXT,
                error TEXT,
                status TEXT DEFAULT 'done',
                PRIMARY KEY (task_id, model_id)
            );
            CREATE TABLE IF NOT EXISTS kv (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


def create_task(task_id, question, system_prompt, model_ids):
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO tasks (id, question, system_prompt, model_ids) VALUES (?,?,?,?)",
            (task_id, question, system_prompt, json.dumps(model_ids)),
        )
        conn.commit()
    finally:
        conn.close()
    snapshot_db()


def set_task_status(task_id, status):
    conn = _conn()
    try:
        conn.execute("UPDATE tasks SET status=? WHERE id=?", (status, task_id))
        conn.commit()
    finally:
        conn.close()
    snapshot_db()


def save_result(task_id, model_id, full_text, first_token_ms, total_ms, usage, error, status="done"):
    conn = _conn()
    try:
        conn.execute(
            """
            INSERT INTO results (task_id, model_id, full_text, first_token_ms, total_ms, usage, error, status)
            VALUES (?,?,?,?,?,?,?,?)
            ON CONFLICT(task_id, model_id) DO UPDATE SET
                full_text=excluded.full_text,
                first_token_ms=excluded.first_token_ms,
                total_ms=excluded.total_ms,
                usage=excluded.usage,
                error=excluded.error,
                status=excluded.status
            """,
            (
                task_id,
                model_id,
                full_text,
                first_token_ms,
                total_ms,
                json.dumps(usage) if usage else None,
                error,
                status,
            ),
        )
        conn.commit()
    finally:
        conn.close()
    snapshot_db()


def get_task(task_id):
    conn = _conn()
    try:
        task = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
        if not task:
            return None
        rows = conn.execute("SELECT * FROM results WHERE task_id=?", (task_id,)).fetchall()
        return {
            "taskId": task["id"],
            "question": task["question"],
            "systemPrompt": task["system_prompt"],
            "modelIds": json.loads(task["model_ids"]),
            "status": task["status"],
            "createdAt": task["created_at"],
            "results": [
                {
                    "modelId": r["model_id"],
                    "fullText": r["full_text"],
                    "firstTokenMs": r["first_token_ms"],
                    "totalMs": r["total_ms"],
                    "usage": json.loads(r["usage"]) if r["usage"] else None,
                    "error": r["error"],
                    "status": r["status"],
                }
                for r in rows
            ],
        }
    finally:
        conn.close()


def get_kv(key):
    conn = _conn()
    try:
        row = conn.execute("SELECT value FROM kv WHERE key=?", (key,)).fetchone()
        return json.loads(row["value"]) if row else None
    finally:
        conn.close()


def set_kv(key, value):
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO kv (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, json.dumps(value)),
        )
        conn.commit()
    finally:
        conn.close()
    snapshot_db()
