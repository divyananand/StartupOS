NOTES = {"text": "Weekly sync notes with enough text to extract."}


def _demo(client):
    r = client.post("/auth/demo")
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_demo_users_hit_their_daily_ai_limit(client):
    demo = _demo(client)  # DEMO_AI_DAILY_LIMIT=2 in conftest
    assert client.post("/ask", json={"text": "What's blocked?"}, headers=demo).status_code == 200
    assert client.post("/ask", json={"text": "What's next?"}, headers=demo).status_code == 200
    r = client.post("/ask", json={"text": "One more?"}, headers=demo)
    assert r.status_code == 429 and "Create a free account" in r.json()["detail"]
    assert client.get("/usage", headers=demo).json() == {"used": 2, "limit": 2}


def test_failed_ai_calls_are_refunded(client, fake_claude):
    demo = _demo(client)
    fake_claude.fail = True
    try:
        assert client.post("/extract", json=NOTES, headers=demo).status_code == 502
    finally:
        fake_claude.fail = False
    assert client.get("/usage", headers=demo).json()["used"] == 0


def test_limit_is_per_user(client):
    first, second = _demo(client), _demo(client)
    for _ in range(2):
        client.post("/ask", json={"text": "hi"}, headers=first)
    assert client.post("/ask", json={"text": "hi"}, headers=first).status_code == 429
    assert client.post("/ask", json={"text": "hi"}, headers=second).status_code == 200
