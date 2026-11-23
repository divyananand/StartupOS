# StartupOS Lite

An AI-powered operating system for early-stage startups. Paste your meeting notes and watch it extract tasks, blockers, and decisions automatically. Ask questions about your company data in plain English. Get a weekly AI report on where your startup stands.

Built this as a learning project to go from zero to full stack AI engineering in 20 days.

## What it does

- **Extract** — paste raw meeting notes, AI pulls out tasks, blockers, and decisions automatically
- **Ask** — ask questions like "what are our blockers?" and get answers from your actual company data
- **Weekly Report** — one-click AI report summarizing your startup's progress, blockers, and priorities
- **Dashboard** — live counts of tasks, documents, blockers, decisions with a progress bar
- **Tasks** — add and filter tasks by status and priority
- **Documents** — store company documents in one place

## Tech stack

- **Frontend** — Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Backend** — FastAPI, Python
- **Database** — PostgreSQL via Supabase
- **AI** — Claude API (claude-sonnet-4-6)
- **Deployment** — Vercel (frontend), Railway (backend)

## Live demo

[https://startup-4r87n0t76-divyandivi.vercel.app](https://startup-4r87n0t76-divyandivi.vercel.app)

## Run locally

**Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\Activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**
```bash
cd startupos
npm install
npm run dev
```

Create a `.env` file in `backend/` with:

```
ANTHROPIC_KEY=your-key
DATABASE_URL=your-supabase-url
# Signs login tokens. Use a long random string and keep it secret:
#   python -c "import secrets; print(secrets.token_urlsafe(48))"
JWT_SECRET=your-random-secret
# Optional: comma-separated list of allowed frontend origins
# (defaults to the Vercel URL plus http://localhost:3000)
FRONTEND_ORIGINS=http://localhost:3000
```

Create a `.env.local` file in `startupos/` (the name must be exactly `.env.local`) with:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

The database tables (including `users` and each table's `user_id`) are created or
upgraded automatically when the backend starts. The **first account** created takes
ownership of any data that existed before accounts were added.

## API

Every endpoint except `/auth/*` needs an `Authorization: Bearer <token>` header and
only ever reads or changes the logged-in user's own data.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create an account → `{token, user}` |
| POST | `/auth/login` | Log in → `{token, user}` |
| GET | `/auth/me` | The logged-in user |
| POST | `/extract` | Extract a **draft** from meeting notes (nothing is saved). Flags missing owners, vague or past deadlines, missing priorities and duplicates |
| POST | `/extract/save` | Save the reviewed draft. Every task must have an owner, a real date and a priority |
| GET / POST | `/tasks` | List / create tasks |
| PATCH / DELETE | `/tasks/{id}` | Update title, owner, deadline, priority or status / delete |
| GET / POST | `/documents` | List / create documents |
| DELETE | `/documents/{id}` | Delete a document |
| GET | `/blockers` | List blockers |
| PATCH | `/blockers/{id}` | Mark a blocker `open` or `resolved` |
| GET | `/decisions` | List decisions |
| POST | `/ask` | Ask a question about company data (with chat history) |
| GET / POST | `/report` | List / generate weekly reports |
