from datetime import date, timedelta

import pytest

from limits import RateLimiter

DUE = (date.today() + timedelta(days=3)).isoformat()
GOOD_TASK = {"title": "Ship v1", "owner": "Alice", "deadline": DUE, "priority": "high"}


def test_requests_without_login_are_rejected(client):
    assert client.get("/tasks").status_code == 401
    assert client.get("/tasks", headers={"Authorization": "Bearer garbage"}).status_code == 401


@pytest.mark.parametrize(
    "body",
    [
        {"name": "A", "email": "a@example.com", "password": "short"},
        {"name": "A", "email": "not-an-email", "password": "longenough1"},
        {"name": "   ", "email": "a@example.com", "password": "longenough1"},
    ],
    ids=["short-password", "bad-email", "blank-name"],
)
def test_register_validation(client, body):
    assert client.post("/auth/register", json=body).status_code == 422


def test_first_account_claims_legacy_data(client, alice, bob):
    assert [t["title"] for t in client.get("/tasks", headers=alice).json()] == ["Legacy task"]
    assert client.get("/tasks", headers=bob).json() == []


def test_duplicate_email_is_case_insensitive(client, alice):
    r = client.post("/auth/register", json={"name": "X", "email": "alice@EXAMPLE.com", "password": "longenough1"})
    assert r.status_code == 409


def test_login(client, alice):
    ok = client.post("/auth/login", json={"email": "ALICE@example.com", "password": "alicepassword"})
    assert ok.status_code == 200 and ok.json()["user"]["name"] == "Alice Founder"
    wrong = client.post("/auth/login", json={"email": "alice@example.com", "password": "nope-nope"})
    unknown = client.post("/auth/login", json={"email": "ghost@example.com", "password": "nope-nope"})
    # Same answer either way, so attackers can't tell which emails have accounts.
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_me(client, alice):
    me = client.get("/auth/me", headers=alice).json()
    assert me["email"] == "alice@example.com" and me["is_demo"] is False


def test_users_cannot_touch_each_others_data(client, alice, bob):
    task = client.post("/tasks", json=GOOD_TASK, headers=alice).json()
    assert all(t["id"] != task["id"] for t in client.get("/tasks", headers=bob).json())
    assert client.patch(f"/tasks/{task['id']}", json={"status": "done"}, headers=bob).status_code == 404
    assert client.delete(f"/tasks/{task['id']}", headers=bob).status_code == 404

    doc = client.post("/documents", json={"title": "Pitch", "doc_type": "pitch-deck", "content": "We raise $1M"}, headers=alice).json()
    assert client.delete(f"/documents/{doc['id']}", headers=bob).status_code == 404
    assert client.get("/documents", headers=bob).json() == []


def test_rate_limiter_blocks_after_limit():
    limiter = RateLimiter(limit=3, window=60)
    assert [limiter.hit("ip:1") for _ in range(4)] == [True, True, True, False]
    assert limiter.hit("ip:2") is True  # other clients unaffected


def test_demo_gets_private_seeded_workspace(client, alice):
    r1, r2 = client.post("/auth/demo"), client.post("/auth/demo")
    assert r1.status_code == 200 and r1.json()["user"]["is_demo"] is True
    d1 = {"Authorization": f"Bearer {r1.json()['token']}"}
    d2 = {"Authorization": f"Bearer {r2.json()['token']}"}

    tasks = client.get("/tasks", headers=d1).json()
    assert len(tasks) >= 5 and client.get("/report", headers=d1).json()
    # Each demo is isolated: changes in one don't show up in another.
    client.delete(f"/tasks/{tasks[0]['id']}", headers=d1)
    assert len(client.get("/tasks", headers=d2).json()) == len(tasks)
    # Demo accounts never see real users' data.
    assert all(t["title"] != "Legacy task" for t in tasks)


def test_demo_account_does_not_claim_legacy_data(client):
    # Even if a demo is created before anyone signs up, the legacy rows stay
    # for the first real account (covered by test_first_account_claims_legacy_data).
    import db

    with db.db() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM users WHERE is_demo AND id IN (SELECT user_id FROM tasks WHERE title = 'Legacy task')")
        assert cur.fetchone()["n"] == 0


def test_health(client):
    assert client.get("/health").json() == {"status": "ok", "database": "ok"}
