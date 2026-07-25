import anthropic
import json
import psycopg2
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_KEY"))
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
print("Database connected successfully")
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://startup-4r87n0t76-divyandivi.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Document(BaseModel):
    title:str
    doc_type:str
    content:str

class Task(BaseModel):
    title: str
    status: str
    date: str
    priority:str

class MeetingNote(BaseModel):
    text: str

class Question(BaseModel):
    text: str
    history: list = []

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/documents")
def create_doc(document: Document):
    cur = conn.cursor()
    cur.execute("INSERT INTO documents (title, doc_type, content) VALUES (%s, %s, %s)", 
               (document.title, document.doc_type, document.content))
    conn.commit()
    return {"title": document.title, "doc_type": document.doc_type, "content": document.content}

@app.get("/documents")
def get_doc():
    cur = conn.cursor()
    cur.execute("SELECT * FROM documents")
    rows = cur.fetchall()
    return [{"id":row[0], "title":row[1],"doc_type":row[2], "content":row[3],"created_At":row[4]} for row in rows]

@app.post("/tasks")
def create_task(task: Task):
    cur = conn.cursor()
    cur.execute("INSERT INTO tasks (title,status,date,priority) VALUES (%s,%s,%s,%s)",
            (task.title,task.status,task.date,task.priority))
    conn.commit()
    return {"title": task.title, "status": task.status, "date": task.date, "priority":task.priority}

@app.get("/tasks")
def get_tasks():
    cur = conn.cursor()
    cur.execute("SELECT * FROM tasks")
    rows = cur.fetchall()
    return[{"id":row[0],"title":row[1],"status":row[2],"date":row[3],"created_at":row[4],"owner":row[5],"priority":row[6],"deadline":row[7]} for row in rows]

@app.get("/blockers")
def ger_blockers():
    cur = conn.cursor()
    cur.execute("SELECT * FROM blockers")
    rows = cur.fetchall()
    return[{"id":row[0],"title":row[1],"description":row[2],"status":row[3],"created_At":row[4]} for row in rows]

@app.get("/decisions")
def get_decisions():
    cur = conn.cursor()
    cur.execute("SELECT * FROM decisions")
    rows = cur.fetchall()
    return [{"id":row[0],"title":row[1],"description":row[2],"created_At":row[3]} for row in rows]

@app.post("/extract")
def extract_meeting(note:MeetingNote):
    message = client.messages.create(
        model = "claude-sonnet-4-6",
        max_tokens = 1024,
        messages = [
            {
                "role":"user",
                "content" : f"""Extract tasks, blockers, and decisions from this meeting note.
                    Respond with ONLY a JSON object in this exact format, nothing else:
                    {{
                    "tasks": [
                        {{"title": "task title", "owner": "person name or unknown", "priority": "high/medium/low", "deadline": "deadline or unknown"}}
                    ],
                    "blockers": ["blocker description"],
                    "decisions": ["decision description"]
                    }}

                    Meeting note:
                    {note.text}"""
            }
        ]
    )
    clean = message.content[0].text.replace("```json", "").replace("```", "").strip()
    result = json.loads(clean)
    cur = conn.cursor()
    for task in result["tasks"]:
        cur.execute("INSERT INTO tasks (title, owner, priority, deadline, status, date) VALUES (%s, %s, %s, %s, %s, %s)",
        (task["title"], task["owner"], task["priority"], task["deadline"], "todo", "unknown"))
    for blocker in result["blockers"]:
        cur.execute("INSERT INTO blockers(title,description,status) VALUES (%s,%s,%s)",
                    (blocker,blocker,"open"))
    for decision in result["decisions"]:
        cur.execute("INSERT INTO decisions(title,description) VALUES (%s,%s)",
                    (decision,decision))
    conn.commit()
    return {"result":result}

@app.post("/ask")
def ask_question(question:Question):
        cur = conn.cursor()

        cur.execute("SELECT title,status, priority FROM tasks")
        tasks = cur.fetchall()

        cur.execute("SELECT title,status FROM blockers")
        blockers = cur.fetchall()

        cur.execute("SELECT title FROM decisions")
        decisions = cur.fetchall()

        tasks_text = "\n".join([f"- {row[0]} | status: {row[1]} | priority: {row[2]}" for row in tasks])
        blockers_text = "\n".join([f"- {row[0]} | status: {row[1]}" for row in blockers])
        decisions_text = "\n".join([f"- {row[0]}" for row in decisions])

        prompt = f"""You are an AI assistant for a startup. Answer the user's question based on the company data below.

        TASKS:
        {tasks_text}

        BLOCKERS:
        {blockers_text}

        DECISIONS:
        {decisions_text}

        User question: {question.text}

        Answer based only on the data provided above. Be concise and specific."""

        messages = []

        for item in question.history:
            messages.append({"role":item["role"],"content":item["content"]})

        messages.append({"role": "user", "content": prompt})
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=messages
        )

        return {"answer": message.content[0].text}

@app.post("/report")
def generate_report():
    cur = conn.cursor()

    cur.execute("SELECT title,status, priority FROM tasks WHERE created_at >= NOW() - INTERVAL '7 days'")
    tasks = cur.fetchall()

    cur.execute("SELECT title,status FROM blockers WHERE created_at >= NOW() - INTERVAL '7 days'")
    blockers = cur.fetchall()

    cur.execute("SELECT title FROM decisions WHERE created_at >= NOW() - INTERVAL '7 days'")
    decisions = cur.fetchall()

    tasks_text = "\n".join([f"- {row[0]} | status: {row[1]} | priority: {row[2]}" for row in tasks])
    blockers_text = "\n".join([f"- {row[0]} | status: {row[1]}" for row in blockers])
    decisions_text = "\n".join([f"- {row[0]}" for row in decisions])

    prompt = f"""You are an AI assistant for a startup. Generate a concise report based on the company data below.

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

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    cur.execute("INSERT INTO reports (title,content) VALUES (%s,%s)",("Weekly Report", message.content[0].text))
    conn.commit()
    return {"report": message.content[0].text}

@app.get("/report")
def get_report():
    cur = conn.cursor()
    cur.execute("SELECT * FROM reports ")
    rows = cur.fetchall()
    return [{"id":row[0],"title":row[1],"content":row[2],"created_At":row[3]} for row in rows]

    