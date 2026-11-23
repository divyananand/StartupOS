"""Test setup: run the real API against a throwaway Postgres schema.

The tests use the database in DATABASE_URL (from .env) but work only inside a
separate schema, `startupos_pytest`, which is created fresh and dropped at the
end, so your real tables and data are never touched. Claude is replaced with a
stub, so tests cost nothing and don't need an API key.

Run from the backend folder:  pytest
"""

import json
import os
import sys
from datetime import date, timedelta

import pytest

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

from dotenv import load_dotenv  # noqa: E402

load_dotenv(os.path.join(BACKEND, ".env"))

import psycopg2  # noqa: E402

SCHEMA = "startupos_pytest"
_base_url = os.environ.get("DATABASE_URL")
if not _base_url:
    pytest.exit("DATABASE_URL is not set (put it in backend/.env)", returncode=2)

# Everything below must be set before the app modules are imported.
_sep = "&" if "?" in _base_url else "?"
os.environ["DATABASE_URL"] = f"{_base_url}{_sep}options=-c%20search_path%3D{SCHEMA}"
os.environ["JWT_SECRET"] = "pytest-secret-" + "z" * 40
os.environ["AI_DAILY_LIMIT"] = "50"
os.environ["DEMO_AI_DAILY_LIMIT"] = "2"
os.environ["AUTH_RATE_LIMIT"] = "1000"
os.environ["DEMO_RATE_LIMIT"] = "1000"


def _admin():
    conn = psycopg2.connect(_base_url)
    conn.autocommit = True
    return conn


_conn = _admin()
_conn.cursor().execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE; CREATE SCHEMA {SCHEMA};")

import db as dbmodule  # noqa: E402

dbmodule.init_db()
# Data from before accounts existed (no owner) — the first real sign-up should claim it.
with dbmodule.db() as cur:
    cur.execute("INSERT INTO tasks (title, status, owner, priority, deadline) VALUES ('Legacy task', 'todo', NULL, 'low', 'Friday')")

import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

TODAY = date.today()
NEXT_FRIDAY = TODAY + timedelta(days=(4 - TODAY.weekday()) % 7 or 7)

CANNED_EXTRACTION = {
    "tasks": [
        {"title": "Finish onboarding redesign", "owner": "Priya", "deadline": NEXT_FRIDAY.isoformat(), "deadline_mentioned": "Friday", "priority": "high"},
        {"title": "Set up Stripe billing", "owner": "the team", "deadline": None, "deadline_mentioned": "soon", "priority": None},
        {"title": "Write investor update", "owner": None, "deadline": "2020-01-01", "deadline_mentioned": "last week", "priority": "medium"},
        {"title": "Finish onboarding redesign", "owner": "Priya", "deadline": NEXT_FRIDAY.isoformat(), "priority": "high"},
    ],
    "blockers": ["Waiting on legal approval", "ok"],
    "decisions": ["Launch beta with 50 users"],
}


class FakeClaude:
    """Stands in for ask_claude; set `.fail = True` to simulate an API error."""

    def __init__(self):
        self.fail = False
        self.calls = 0

    def __call__(self, messages, max_tokens=1024):
        self.calls += 1
        if self.fail:
            from fastapi import HTTPException

            raise HTTPException(status_code=502, detail="The AI service returned an error: stub")
        if "Extract tasks" in messages[-1]["content"]:
            return "```json\n" + json.dumps(CANNED_EXTRACTION) + "\n```"
        return "## Report\n- stub answer"


@pytest.fixture(scope="session")
def fake_claude():
    fake = FakeClaude()
    main.ask_claude = fake
    return fake


@pytest.fixture(scope="session")
def client(fake_claude):
    with TestClient(main.app) as c:
        yield c


def _register(client, name, email, password):
    r = client.post("/auth/register", json={"name": name, "email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def alice(client):
    """The first account created: owns the legacy data."""
    return _register(client, "Alice Founder", "Alice@Example.com", "alicepassword")


@pytest.fixture(scope="session")
def bob(client, alice):
    return _register(client, "Bob", "bob@example.com", "bobpassword")


def pytest_sessionfinish(session, exitstatus):
    try:
        dbmodule.pool.closeall()
    finally:
        _conn.cursor().execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE;")
        _conn.close()
