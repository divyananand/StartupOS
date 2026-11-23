"""Rules for what counts as a complete task, blocker, decision or document.

These close the gaps where the AI (or a form) could save half-filled records:
tasks with no owner, vague deadlines like "soon", silently guessed priorities,
empty documents and duplicate entries from extracting the same notes twice.
"""

import re
from datetime import date, timedelta
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

Status = Literal["todo", "in-progress", "done"]
Priority = Literal["high", "medium", "low"]
DocType = Literal["pitch-deck", "sop", "brief", "notes", "other"]

# Words that name a group or nobody, not a person who can be held to a task.
VAGUE_OWNERS = {
    "", "unknown", "none", "null", "n/a", "na", "tbd", "tba", "?", "-",
    "we", "us", "team", "the team", "everyone", "everybody", "all",
    "someone", "somebody", "anyone", "anybody", "they", "them", "whoever",
}


def is_vague_owner(owner: Optional[str]) -> bool:
    return owner is None or owner.strip().lower() in VAGUE_OWNERS


def parse_iso_date(value) -> Optional[date]:
    """Only real calendar dates count; "Friday" or "end of week" do not."""
    if isinstance(value, date):
        return value
    if isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value.strip()):
        try:
            return date.fromisoformat(value.strip())
        except ValueError:
            return None
    return None


def earliest_allowed_deadline() -> date:
    # One day of slack so users ahead of the server's UTC clock aren't rejected.
    return date.today() - timedelta(days=1)


def normalize_title(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def clean_title(v: str) -> str:
    v = " ".join(v.split())
    if len(v) < 3:
        raise ValueError("Task title must be at least 3 characters")
    if len(v) > 200:
        raise ValueError("Task title must be at most 200 characters")
    return v


def clean_owner(v: str) -> str:
    v = " ".join(v.split())
    if is_vague_owner(v):
        raise ValueError(f"“{v or 'blank'}” isn't a specific person. Name who owns this task")
    if len(v) > 80:
        raise ValueError("Owner name must be at most 80 characters")
    return v


class TaskIn(BaseModel):
    """A complete task. Owner, deadline and priority are all required."""

    title: str
    owner: str
    deadline: date
    priority: Priority
    status: Status = "todo"

    @field_validator("title")
    @classmethod
    def check_title(cls, v):
        return clean_title(v)

    @field_validator("owner")
    @classmethod
    def check_owner(cls, v):
        return clean_owner(v)

    @model_validator(mode="after")
    def deadline_not_in_past(self):
        if self.status != "done" and self.deadline < earliest_allowed_deadline():
            raise ValueError(f"The deadline for “{self.title}” is in the past. Pick today or a later date")
        return self


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    owner: Optional[str] = None
    deadline: Optional[date] = None
    priority: Optional[Priority] = None
    status: Optional[Status] = None

    @field_validator("title")
    @classmethod
    def check_title(cls, v):
        return None if v is None else clean_title(v)

    @field_validator("owner")
    @classmethod
    def check_owner(cls, v):
        return None if v is None else clean_owner(v)

    @field_validator("deadline")
    @classmethod
    def check_deadline(cls, v):
        if v is not None and v < earliest_allowed_deadline():
            raise ValueError("The deadline is in the past. Pick today or a later date")
        return v


def clean_statement(v: str, kind: str) -> str:
    v = " ".join(v.split())
    if len(v) < 5:
        raise ValueError(f"Each {kind} needs a short description (at least 5 characters)")
    if len(v) > 500:
        raise ValueError(f"Each {kind} must be at most 500 characters")
    return v


class ExtractionSave(BaseModel):
    """What the user confirmed after reviewing an extraction draft."""

    tasks: list[TaskIn] = []
    blockers: list[str] = []
    decisions: list[str] = []

    @field_validator("blockers")
    @classmethod
    def check_blockers(cls, v):
        return [clean_statement(b, "blocker") for b in v]

    @field_validator("decisions")
    @classmethod
    def check_decisions(cls, v):
        return [clean_statement(d, "decision") for d in v]

    @model_validator(mode="after")
    def not_empty(self):
        if not (self.tasks or self.blockers or self.decisions):
            raise ValueError("Select at least one item to save")
        return self


class DocumentIn(BaseModel):
    title: str = Field(max_length=200)
    doc_type: DocType
    content: str

    @field_validator("title")
    @classmethod
    def check_title(cls, v):
        v = " ".join(v.split())
        if not v:
            raise ValueError("Document title is required")
        return v

    @field_validator("content")
    @classmethod
    def check_content(cls, v):
        if not v.strip():
            raise ValueError("Document content can't be empty")
        return v.strip()


# ---------- Turning a raw AI extraction into a reviewable draft ----------

def build_draft(raw: dict, existing: dict) -> dict:
    """Check every extracted item and explain what is missing.

    `existing` holds normalized titles already in the user's workspace
    (keys: tasks, blockers, decisions) so repeats can be flagged.
    """
    today = date.today()
    seen = {"tasks": set(), "blockers": set(), "decisions": set()}

    tasks = []
    for t in raw.get("tasks") or []:
        if not isinstance(t, dict):
            continue
        title = " ".join(str(t.get("title") or "").split())
        if len(title) < 3:
            continue
        key = normalize_title(title)
        if key in seen["tasks"]:
            continue
        seen["tasks"].add(key)

        owner = t.get("owner")
        owner = None if is_vague_owner(owner if isinstance(owner, str) else None) else " ".join(str(owner).split())

        mentioned = t.get("deadline_mentioned")
        mentioned = str(mentioned).strip() if mentioned and str(mentioned).strip().lower() not in VAGUE_OWNERS else None
        deadline = parse_iso_date(t.get("deadline"))

        priority = str(t.get("priority") or "").lower()
        priority = priority if priority in ("high", "medium", "low") else None

        issues = {}
        if owner is None:
            issues["owner"] = "No one was named as the owner."
        if deadline is None:
            issues["deadline"] = (
                f"“{mentioned}” isn't a specific date." if mentioned else "No deadline was mentioned."
            )
        elif deadline < today:
            issues["deadline"] = f"{deadline.isoformat()} is in the past."
            deadline = None
        if priority is None:
            issues["priority"] = "The notes don't say how urgent this is."

        tasks.append(
            {
                "title": title,
                "owner": owner,
                "deadline": deadline.isoformat() if deadline else None,
                "deadline_mentioned": mentioned,
                "priority": priority,
                "issues": issues,
                "duplicate": key in existing["tasks"],
            }
        )

    def statements(kind):
        out = []
        for s in raw.get(kind) or []:
            text = " ".join(str(s or "").split())
            key = normalize_title(text)
            if len(text) < 5 or key in seen[kind]:
                continue
            seen[kind].add(key)
            out.append({"text": text, "duplicate": key in existing[kind]})
        return out

    blockers = statements("blockers")
    decisions = statements("decisions")

    incomplete = [t for t in tasks if t["issues"] and not t["duplicate"]]
    questions = []
    for t in incomplete:
        need = []
        if "owner" in t["issues"]:
            need.append("who owns it")
        if "deadline" in t["issues"]:
            need.append("when it's due")
        if "priority" in t["issues"]:
            need.append("how urgent it is")
        questions.append(f"For “{t['title']}”, tell me {', '.join(need[:-1]) + ' and ' + need[-1] if len(need) > 1 else need[0]}.")

    total = len(tasks) + len(blockers) + len(decisions)
    duplicates = sum(1 for item in [*tasks, *blockers, *decisions] if item["duplicate"])
    new = total - duplicates
    plural = lambda n, word: f"{n} {word}{'' if n == 1 else 's'}"  # noqa: E731

    if total == 0:
        message = "I couldn't find any tasks, blockers or decisions in these notes. Try adding more detail."
    elif new == 0:
        message = "Everything in these notes is already in your workspace, so there's nothing new to save."
    elif incomplete:
        message = (
            f"I found {plural(new, 'new item')}, but {len(incomplete)} "
            f"task{'s are' if len(incomplete) != 1 else ' is'} missing details. "
            "Fill them in below and I'll save everything."
        )
    else:
        message = f"I found {plural(new, 'new item')} and everything is complete. Review and save."
    if duplicates and new:
        message += f" {plural(duplicates, 'item')} already in your workspace {'was' if duplicates == 1 else 'were'} unticked."

    return {
        "tasks": tasks,
        "blockers": blockers,
        "decisions": decisions,
        "questions": questions,
        "message": message,
        "complete": new > 0 and not incomplete,
    }
