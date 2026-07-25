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

- **Frontend** — Next.js 15, TypeScript, Tailwind CSS
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

ANTHROPIC_KEY=your-key
DATABASE_URL=your-supabase-url


Create a `.env.local` file in `startupos/` with:

