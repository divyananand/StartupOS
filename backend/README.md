# StartupOS — backend

FastAPI service behind [StartupOS](../README.md): accounts, per-user data, AI extraction with validation, Q&A and weekly reports.

## Run

```bash
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Database tables are created or upgraded automatically on startup (`db.py`). The **first real account** created takes ownership of any data that existed before accounts were added. Demo accounts never do.

## Settings (`.env`)

| Variable | Required | Default | What it does |
|---|---|---|---|
| `ANTHROPIC_KEY` | yes | | Claude API key |
| `DATABASE_URL` | yes | | Postgres connection string |
| `JWT_SECRET` | yes in production | random per start | Signs login tokens. If unset, everyone is logged out on every restart |
| `CLAUDE_MODEL` | | `claude-sonnet-4-6` | Model used for extract, ask and reports |
| `FRONTEND_ORIGINS` | | Vercel URL + `localhost:3000` | Comma-separated origins allowed by CORS |
| `FRONTEND_ORIGIN_REGEX` | | `https://startup[a-z0-9-]*\.vercel\.app` | Extra allowed origins (Vercel preview URLs) |
| `AI_DAILY_LIMIT` | | `30` | AI requests per user per day |
| `DEMO_AI_DAILY_LIMIT` | | `5` | AI requests per demo account per day |
| `DEMO_AI_GLOBAL_DAILY_LIMIT` | | `60` | AI requests per day across all demo accounts |
| `AI_GLOBAL_DAILY_LIMIT` | | `300` | Hard cap on AI requests per day across everyone |
| `AUTH_RATE_LIMIT` | | `10` | Login/sign-up attempts per IP (and per email) per 5 minutes |
| `DEMO_RATE_LIMIT` | | `5` | Demo accounts created per IP per hour |
| `DB_POOL_SIZE` | | `8` | Maximum open database connections |

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

The suite runs the real API against the database in `DATABASE_URL`, but only inside a throwaway `startupos_pytest` schema that is dropped at the end. Claude is replaced with a stub.

## API

Every endpoint except `/`, `/health` and `/auth/*` needs an `Authorization: Bearer <token>` header and only reads or changes the signed-in user's own data. Errors come back as `{"detail": "message"}`.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Checks the API and database (used by the daily keep-alive job) |
| POST | `/auth/register` | Create an account → `{token, user}` |
| POST | `/auth/login` | Log in → `{token, user}` |
| POST | `/auth/demo` | Create a 24-hour demo account with sample data → `{token, user}` |
| GET | `/auth/me` | The signed-in user |
| GET | `/usage` | AI requests used today and the daily limit |
| POST | `/extract` | Draft tasks, blockers and decisions from meeting notes. **Nothing is saved.** Flags missing owners, vague or past deadlines, missing priorities and duplicates |
| POST | `/extract/save` | Save the reviewed draft. Every task needs an owner, a real date and a priority |
| GET / POST | `/tasks` | List / create tasks (owner, deadline and priority required) |
| PATCH / DELETE | `/tasks/{id}` | Update title, owner, deadline, priority or status / delete |
| GET / POST | `/documents` | List / create documents |
| DELETE | `/documents/{id}` | Delete a document |
| GET | `/blockers` | List blockers |
| PATCH | `/blockers/{id}` | Mark a blocker `open` or `resolved` |
| GET | `/decisions` | List decisions |
| POST | `/ask` | Ask a question about your data (with chat history) |
| GET / POST | `/report` | List / generate weekly reports (needs activity in the last 7 days) |

AI endpoints (`/extract`, `/ask`, `POST /report`) return **429** when a daily limit is reached.
