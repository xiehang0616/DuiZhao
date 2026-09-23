import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]  # backend/
load_dotenv(BACKEND_DIR / ".env")


def env(name, default=""):
    return os.environ.get(name, default).strip()


def env_int(name, default):
    try:
        return int(env(name, str(default)))
    except ValueError:
        return default


def env_path(name):
    """读取路径类环境变量；未设置返回 None，相对路径按 backend/ 目录解析。"""
    value = env(name)
    if not value:
        return None
    p = Path(value).expanduser()
    return p if p.is_absolute() else BACKEND_DIR / p


PORT = env_int("PORT", 8000)

# 生成媒体落盘目录（本地默认 backend/data/media；线上 veFaaS 可挂载 TOS 到 /mnt/data，设为 /mnt/data/media）
MEDIA_DIR = env_path("MEDIA_DIR") or (BACKEND_DIR / "data" / "media")

# 持久化目录：veFaaS 弹性实例 /tmp 会随回收丢失，挂载 TOS 后指向挂载点（如 /mnt/data），
# 后端会把 SQLite 快照与媒体写入该目录；本地未设置则为 None（不启用快照备份）。
PERSIST_DIR = env_path("PERSIST_DIR")

# 上游并发闸门：限制同时进行的真实模型请求数，避免大量并发触发 429/509 限流。
MAX_UPSTREAM_CONCURRENCY = env_int("MAX_UPSTREAM_CONCURRENCY", 4)
