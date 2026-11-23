import json
import os
import traceback
from datetime import date
from typing import Literal

import anthropic
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

load_dotenv()

from auth import current_user, router as auth_router  # noqa: E402
from db import db, init_db, normalize  # noqa: E402
from validation import (  # noqa: E402
    DocumentIn,
    ExtractionSave,
    TaskIn,
    TaskUpdate,
    build_draft,
    normalize_title,
)

MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_KEY"))

init_db()
print("Database connected successfully")


def ask_claude(messages, max_tokens=1024):
    try:
        message = client.messages.create(model=MODEL, max_tokens=max_tokens, messages=messages)
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"The AI service returned an error: {e}")
    return message.content[0].text


app = FastAPI(title="StartupOS API")


# Registered before CORS so CORS wraps it: unexpected errors still reach the
# browser as a readable 500 instead of looking like "server unreachable".
@app.middleware("http")
async def catch_unexpected_errors(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": "Something went wrong on the server. Please try again."})


default_origins = "https://startup-4r87n0t76-divyandivi.vercel.app,http://localhost:3000,http://127.0.0.1:3000"
origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Vercel gives every deployment a new URL; allow this project's ones.
    allow_origin_regex=r"https://startup-[a-z0-9-]+-divyandivi\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

User = dict  # shape: {"id", "name", "email"}


class BlockerUpdate(BaseModel):
    status: Literal["open", "resolved"]


class MeetingNote(BaseModel):
    text: str = Field(min_length=20, max_length=30000)


class HistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class Question(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    history: list[HistoryItem] = []


@app.get("/")
def read_root():
    return {"status": "ok"}


# ---------- Documents ----------

@app.post("/documents")
def create_doc(document: DocumentIn, user: User = Depends(current_user)):
    with db() as cur:
        cur.execute(
            "INSERT INTO documents (title, doc_type, content, user_id) VALUES (%s, %s, %s, %s) RETURNING *",
            (document.title, document.doc_type, document.content, user["id"]),
        )
        return normalize([cur.fetchone()])[0]


@app.get("/documents")
def get_docs(user: User = Depends(current_user)):
    with db() as cur:
        cur.execute("SELECT * FROM documents WHERE user_id = %s ORDER BY id", (user["id"],))
        return normalize(cur.fetchall())


@app.delete("/documents/{doc_id}")
def delete_doc(doc_id: int, user: User = Depends(current_user)):
    with db() as cur:
        cur.execute("DELETE FROM documents WHERE id = %s AND user_id = %s", (doc_id, user["id"]))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Document not found")
    return {"ok": True}


# ---------- Tasks ----------

def insert_task(cur, task: TaskIn, user_id: int):
    deadline = task.deadline.isoformat()
    cur.execute(
        "INSERT INTO tasks (title, status, date, priority, owner, deadline, user_id) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *",
        (task.title, task.status, deadline, task.priority, task.owner, deadline, user_id),
    )
    return cur.fetchone()


@app.post("/tasks")
def create_task(task: TaskIn, user: User = Depends(current_user)):
    with db() as cur:
        return normalize([insert_task(cur, task, user["id"])])[0]


@app.get("/tasks")
def get_tasks(user: User = Depends(current_user)):
    with db() as cur:
        cur.execute("SELECT * FROM tasks WHERE user_id = %s ORDER BY id", (user["id"],))
        return normalize(cur.fetchall())


@app.patch("/tasks/{task_id}")
def update_task(task_id: int, update: TaskUpdate, user: User = Depends(current_user)):
    fields = update.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Nothing to update")
    if "deadline" in fields:
        fields["deadline"] = fields["deadline"].isoformat()
        fields["date"] = fields["deadline"]
    # Column names come from the fixed TaskUpdate model, never from user input.
    assignments = ", ".join(f"{name} = %s" for name in fields)
    with db() as cur:
        cur.execute(
            f"UPDATE tasks SET {assignments} WHERE id = %s AND user_id = %s RETURNING *",
            (*fields.values(), task_id, user["id"]),
        )
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Task not found")
        return normalize([row])[0]


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, user: User = Depends(current_user)):
    with db() as cur:
        cur.execute("DELETE FROM tasks WHERE id = %s AND user_id = %s", (task_id, user["id"]))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}


# ---------- Blockers & decisions ----------

@app.get("/blockers")
def get_blockers(user: User = Depends(current_user)):
    with db() as cur:
        cur.execute("SELECT * FROM blockers WHERE user_id = %s ORDER BY id", (user["id"],))
        return normalize(cur.fetchall())


@app.patch("/blockers/{blocker_id}")
def update_blocker(blocker_id: int, update: BlockerUpdate, user: User = Depends(current_user)):
    with db() as cur:
        cur.execute(
            "UPDATE blockers SET status = %s WHERE id = %s AND user_id = %s RETURNING *",
            (update.status, blocker_id, user["id"]),
        )
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Blocker not found")
        return normalize([row])[0]


@app.get("/decisions")
def get_decisions(user: User = Depends(current_user)):
    with db() as cur:
        cur.execute("SELECT * FROM decisions WHERE user_id = %s ORDER BY id", (user["id"],))
        return normalize(cur.fetchall())


# ---------- Extraction: draft first, save after the user fills gaps ----------

def parse_json_object(text: str) -> dict:
    """Pull the JSON object out of a model reply, tolerating code fences or extra prose."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object found")
    return json.loads(text[start : end + 1])


def extraction_prompt(notes: str) -> str:
    today = date.today()
    return f"""Extract tasks, blockers, and decisions from this meeting note.

Today is {today.strftime('%A')}, {today.isoformat()}.

Rules — never guess. Use null whenever the notes don't say it explicitly:
- "owner": the name of ONE specific person responsible. Use null if no person is named,
  or if it says "we", "the team", "someone", etc.
- "deadline": an exact calendar date in YYYY-MM-DD. Convert relative dates using today's
  date (e.g. "Friday" -> the coming Friday, "end of month" -> last day of this month).
  Use null if no deadline is mentioned or it is too vague to pin down (e.g. "soon", "later").
- "deadline_mentioned": the deadline words exactly as written in the notes, or null.
- "priority": "high", "medium" or "low" only if the notes signal urgency or importance
  (e.g. "urgent", "blocking", "nice to have"). Otherwise null.

Respond with ONLY a JSON object in this exact format, nothing else:
{{
  "tasks": [
    {{"title": "short task title", "owner": "Name or null", "deadline": "YYYY-MM-DD or null", "deadline_mentioned": "text or null", "priority": "high/medium/low or null"}}
  ],
  "blockers": ["blocker description"],
  "decisions": ["decision description"]
}}

Meeting note:
{notes}"""


@app.post("/extract")
def extract_meeting(note: MeetingNote, user: User = Depends(current_user)):
    """Return a draft for review. Nothing is saved until /extract/save."""
    reply = ask_claude([{"role": "user", "content": extraction_prompt(note.text)}], max_tokens=4096)
    try:
        raw = parse_json_object(reply)
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=502, detail="The AI reply couldn't be read. Please try again.")

    # Flag items that already exist so re-extracting the same notes doesn't duplicate them.
    with db() as cur:
        cur.execute("SELECT title FROM tasks WHERE user_id = %s AND status <> 'done'", (user["id"],))
        tasks = {normalize_title(r["title"] or "") for r in cur.fetchall()}
        cur.execute("SELECT title FROM blockers WHERE user_id = %s AND status = 'open'", (user["id"],))
        blockers = {normalize_title(r["title"] or "") for r in cur.fetchall()}
        cur.execute("SELECT title FROM decisions WHERE user_id = %s", (user["id"],))
        decisions = {normalize_title(r["title"] or "") for r in cur.fetchall()}

    return build_draft(raw, {"tasks": tasks, "blockers": blockers, "decisions": decisions})


@app.post("/extract/save")
def save_extraction(body: ExtractionSave, user: User = Depends(current_user)):
    with db() as cur:
        for task in body.tasks:
            insert_task(cur, task, user["id"])
        for blocker in body.blockers:
            cur.execute(
                "INSERT INTO blockers (title, description, status, user_id) VALUES (%s, %s, 'open', %s)",
                (blocker, blocker, user["id"]),
            )
        for decision in body.decisions:
            cur.execute(
                "INSERT INTO decisions (title, description, user_id) VALUES (%s, %s, %s)",
                (decision, decision, user["id"]),
            )
    return {"saved": {"tasks": len(body.tasks), "blockers": len(body.blockers), "decisions": len(body.decisions)}}


# ---------- Ask & reports ----------

def bullet_list(lines):
    return "\n".join(lines) if lines else "(none)"


@app.post("/ask")
def ask_question(question: Question, user: User = Depends(current_user)):
    uid = (user["id"],)
    with db() as cur:
        cur.execute("SELECT title, status, priority, owner, deadline FROM tasks WHERE user_id = %s", uid)
        tasks = cur.fetchall()
        cur.execute("SELECT title, status FROM blockers WHERE user_id = %s", uid)
        blockers = cur.fetchall()
        cur.execute("SELECT title FROM decisions WHERE user_id = %s", uid)
        decisions = cur.fetchall()
        cur.execute("SELECT title, doc_type, content FROM documents WHERE user_id = %s", uid)
        documents = cur.fetchall()

    tasks_text = bullet_list(
        [
            f"- {r['title']} | status: {r['status']} | priority: {r['priority']} | owner: {r['owner']} | deadline: {r['deadline']}"
            for r in tasks
        ]
    )
    blockers_text = bullet_list([f"- {r['title']} | status: {r['status']}" for r in blockers])
    decisions_text = bullet_list([f"- {r['title']}" for r in decisions])
    documents_text = bullet_list(
        [f"- {r['title']} ({r['doc_type']}): {(r['content'] or '')[:1500]}" for r in documents]
    )

    prompt = f"""You are an AI assistant for a startup. Answer the user's question based on the company data below.
Today is {date.today().isoformat()}.

TASKS:
{tasks_text}

BLOCKERS:
{blockers_text}

DECISIONS:
{decisions_text}

DOCUMENTS:
{documents_text}

User question: {question.text}

Answer based only on the data provided above. If the data doesn't contain the answer, say so plainly
instead of guessing. Be concise and specific. Use markdown lists where helpful."""

    # Keep the last few turns so follow-up questions work without growing forever.
    messages = [{"role": h.role, "content": h.content} for h in question.history[-10:]]
    messages.append({"role": "user", "content": prompt})

    return {"answer": ask_claude(messages)}


@app.post("/report")
def generate_report(user: User = Depends(current_user)):
    uid = (user["id"],)
    with db() as cur:
        cur.execute(
            "SELECT title, status, priority, owner, deadline FROM tasks "
            "WHERE user_id = %s AND created_at >= NOW() - INTERVAL '7 days'",
            uid,
        )
        tasks = cur.fetchall()
        cur.execute(
            "SELECT title, status FROM blockers WHERE user_id = %s AND created_at >= NOW() - INTERVAL '7 days'",
            uid,
        )
        blockers = cur.fetchall()
        cur.execute(
            "SELECT title FROM decisions WHERE user_id = %s AND created_at >= NOW() - INTERVAL '7 days'",
            uid,
        )
        decisions = cur.fetchall()

    if not (tasks or blockers or decisions):
        raise HTTPException(
            status_code=400,
            detail="Nothing was added in the last 7 days, so there's nothing to report yet. Extract a meeting or add tasks first.",
        )

    tasks_text = bullet_list(
        [
            f"- {r['title']} | status: {r['status']} | priority: {r['priority']} | owner: {r['owner']} | deadline: {r['deadline']}"
            for r in tasks
        ]
    )
    blockers_text = bullet_list([f"- {r['title']} | status: {r['status']}" for r in blockers])
    decisions_text = bullet_list([f"- {r['title']}" for r in decisions])

    prompt = f"""You are an AI assistant for a startup. Generate a concise report based on the company data below.
Today is {date.today().isoformat()}.

TASKS:
{tasks_text}

BLOCKERS:
{blockers_text}

DECISIONS:
{decisions_text}

Generate a weekly startup execution report with these sections:
## Progress This Week
## Open Blockers
## Important Decisions
## Next Week Priorities

Be specific and actionable. Base everything only on the data provided."""

    content = ask_claude([{"role": "user", "content": prompt}])

    with db() as cur:
        cur.execute(
            "INSERT INTO reports (title, content, user_id) VALUES (%s, %s, %s) RETURNING *",
            ("Weekly Report", content, user["id"]),
        )
        row = normalize([cur.fetchone()])[0]

    return {"report": content, "item": row}


@app.get("/report")
def get_reports(user: User = Depends(current_user)):
    with db() as cur:
        cur.execute("SELECT * FROM reports WHERE user_id = %s ORDER BY id", (user["id"],))
        return normalize(cur.fetchall())
