from datetime import date, timedelta

import pytest

from validation import build_draft

DUE = (date.today() + timedelta(days=3)).isoformat()
GOOD_TASK = {"title": "Ship v1", "owner": "Alice", "deadline": DUE, "priority": "high"}
NOTES = {"text": "Weekly sync notes with enough text to extract."}


@pytest.mark.parametrize(
    "patch",
    [
        {"owner": None},
        {"owner": "team"},
        {"owner": "someone"},
        {"deadline": None},
        {"deadline": "Friday"},
        {"deadline": "2020-01-01"},
        {"priority": None},
        {"priority": "urgent"},
        {"title": "x"},
    ],
    ids=["no-owner", "owner-team", "owner-someone", "no-deadline", "vague-deadline", "past-deadline", "no-priority", "bad-priority", "short-title"],
)
def test_incomplete_tasks_are_rejected(client, alice, patch):
    body = {k: v for k, v in {**GOOD_TASK, **patch}.items() if v is not None}
    assert client.post("/tasks", json=body, headers=alice).status_code == 422


def test_complete_task_is_saved_and_editable(client, alice):
    task = client.post("/tasks", json=GOOD_TASK, headers=alice).json()
    assert task["owner"] == "Alice" and task["deadline"] == DUE
    assert client.patch(f"/tasks/{task['id']}", json={"owner": "we"}, headers=alice).status_code == 422
    r = client.patch(f"/tasks/{task['id']}", json={"owner": "Carol", "status": "in-progress"}, headers=alice)
    assert r.status_code == 200 and r.json()["owner"] == "Carol"


def test_documents_need_content_and_known_type(client, alice):
    assert client.post("/documents", json={"title": "P", "doc_type": "pitch-deck", "content": "  "}, headers=alice).status_code == 422
    assert client.post("/documents", json={"title": "P", "doc_type": "random", "content": "x"}, headers=alice).status_code == 422


def test_extract_returns_draft_without_saving(client, bob):
    before = len(client.get("/tasks", headers=bob).json())
    assert client.post("/extract", json={"text": "short"}, headers=bob).status_code == 422

    d = client.post("/extract", json=NOTES, headers=bob).json()
    assert len(client.get("/tasks", headers=bob).json()) == before  # nothing saved yet

    titles = [t["title"] for t in d["tasks"]]
    assert titles.count("Finish onboarding redesign") == 1  # repeated item collapsed
    complete, vague, past = d["tasks"]
    assert complete["issues"] == {}
    assert vague["owner"] is None and "owner" in vague["issues"] and "priority" in vague["issues"]
    assert "soon" in vague["issues"]["deadline"]
    assert past["deadline"] is None and "past" in past["issues"]["deadline"]
    assert [b["text"] for b in d["blockers"]] == ["Waiting on legal approval"]  # "ok" too short
    assert d["complete"] is False and len(d["questions"]) == 2


def test_extract_save_requires_complete_items(client, bob):
    incomplete = {"tasks": [{"title": "Set up Stripe billing"}], "blockers": [], "decisions": []}
    assert client.post("/extract/save", json=incomplete, headers=bob).status_code == 422
    assert client.post("/extract/save", json={"tasks": [], "blockers": [], "decisions": []}, headers=bob).status_code == 422

    fixed = {
        "tasks": [{"title": "Set up Stripe billing", "owner": "Arjun", "deadline": DUE, "priority": "medium"}],
        "blockers": ["Waiting on legal approval"],
        "decisions": ["Launch beta with 50 users"],
    }
    r = client.post("/extract/save", json=fixed, headers=bob)
    assert r.json()["saved"] == {"tasks": 1, "blockers": 1, "decisions": 1}


def test_re_extracting_flags_duplicates(client, bob):
    d = client.post("/extract", json=NOTES, headers=bob).json()
    stripe = next(t for t in d["tasks"] if t["title"] == "Set up Stripe billing")
    assert stripe["duplicate"] is True
    assert d["blockers"][0]["duplicate"] is True and d["decisions"][0]["duplicate"] is True


def test_draft_message_when_everything_already_exists():
    raw = {"tasks": [{"title": "Ship it", "owner": "A", "deadline": "2099-01-01", "priority": "high"}], "blockers": [], "decisions": []}
    d = build_draft(raw, {"tasks": {"ship it"}, "blockers": set(), "decisions": set()})
    assert "already in your workspace" in d["message"] and d["complete"] is False


def test_report_needs_recent_activity(client):
    r = client.post("/auth/register", json={"name": "Empty", "email": "empty@example.com", "password": "emptypassword"})
    empty = {"Authorization": f"Bearer {r.json()['token']}"}
    assert client.post("/report", headers=empty).status_code == 400
