import json
import sqlite3
from .config import BACKEND_DIR

DB_PATH = BACKEND_DIR / "data" / "duizhao.db"


def _conn():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
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


def set_task_status(task_id, status):
    conn = _conn()
    try:
        conn.execute("UPDATE tasks SET status=? WHERE id=?", (status, task_id))
        conn.commit()
    finally:
        conn.close()


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
