import os
import queue
import threading
from contextlib import contextmanager

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

load_dotenv()

class ConnectionPool:
    """A small connection pool that keeps connections open for reuse.

    psycopg2's built-in pools close every idle connection above `minconn`
    and open new ones while holding a lock. Against a remote database (about
    2s per new connection) that made parallel requests queue up for
    20 seconds. Here connections open lazily, in parallel, and stay open;
    requests beyond `size` wait for a free one instead of erroring.
    """

    def __init__(self, dsn: str, size: int, **connect_kwargs):
        self._dsn = dsn
        self._kwargs = connect_kwargs
        self._idle: queue.LifoQueue = queue.LifoQueue()
        self._slots = threading.BoundedSemaphore(size)

    def get(self, timeout: float = 30):
        if not self._slots.acquire(timeout=timeout):
            raise RuntimeError("Timed out waiting for a database connection")
        try:
            while True:
                try:
                    conn = self._idle.get_nowait()
                except queue.Empty:
                    return psycopg2.connect(self._dsn, **self._kwargs)
                if not conn.closed:
                    return conn
        except Exception:
            self._slots.release()
            raise

    def put(self, conn, discard: bool = False):
        try:
            if discard or conn.closed:
                try:
                    conn.close()
                except Exception:
                    pass
            else:
                self._idle.put(conn)
        finally:
            self._slots.release()

    def closeall(self):
        while True:
            try:
                self._idle.get_nowait().close()
            except queue.Empty:
                return


pool = ConnectionPool(
    os.getenv("DATABASE_URL"),
    int(os.getenv("DB_POOL_SIZE", "8")),
    keepalives=1,
    keepalives_idle=30,
    keepalives_interval=10,
    keepalives_count=5,
)


@contextmanager
def db():
    """Yield a dict cursor; commit on success, roll back on any error."""
    conn = pool.get()
    broken = False
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
        conn.commit()
    except Exception as e:
        # A dropped connection can't be reused; anything else just rolls back.
        broken = isinstance(e, (psycopg2.OperationalError, psycopg2.InterfaceError))
        try:
            conn.rollback()
        except Exception:
            broken = True
        raise
    finally:
        pool.put(conn, discard=broken)


def normalize(rows):
    """Lower-case column names so the API always returns e.g. `created_at`."""
    return [{k.lower(): v for k, v in row.items()} for row in rows]


# Tables that hold per-user data. Every query against them filters by user_id.
USER_TABLES = ("tasks", "documents", "blockers", "decisions", "reports")

# Safe to run on every start: creates what is missing, never drops anything.
SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY, title TEXT, status TEXT, date TEXT,
    created_at TIMESTAMP DEFAULT NOW(), owner TEXT, priority TEXT, deadline TEXT
);
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY, title TEXT, doc_type TEXT, content TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS blockers (
    id SERIAL PRIMARY KEY, title TEXT, description TEXT, status TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS decisions (
    id SERIAL PRIMARY KEY, title TEXT, description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY, title TEXT, content TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
""" + "".join(
    f"""
ALTER TABLE {t} ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS {t}_user_id_idx ON {t}(user_id);
"""
    for t in USER_TABLES
) + """
-- Demo accounts get a private sample workspace and are deleted after a day.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- One row per user per day, counting AI requests. Rows outlive deleted demo
-- users (user_id becomes NULL) so daily totals can't be reset by cleanup.
CREATE TABLE IF NOT EXISTS ai_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    day DATE NOT NULL DEFAULT CURRENT_DATE,
    count INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, day)
);
CREATE INDEX IF NOT EXISTS ai_usage_day_idx ON ai_usage(day);
"""


def init_db():
    with db() as cur:
        cur.execute(SCHEMA)
