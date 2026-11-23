# StartupOS — frontend

Next.js 16 app for [StartupOS](../README.md).

## Run

```bash
npm install
npm run dev
```

Create `.env.local` (the filename must be exactly this) pointing at the backend:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Open http://localhost:3000.

## Checks

```bash
npx tsc --noEmit                 # types
npx eslint app components lib    # lint
npm run build                    # production build
```

## Layout

| Path | What's there |
|---|---|
| `app/` | Pages: home, login, signup, dashboard, tasks, documents, extract, ask, report, workflows |
| `components/app-shell.tsx` | Sidebar layout, login redirects, demo banner |
| `components/ui.tsx` | Buttons, cards, badges, empty and error states, markdown |
| `lib/api.ts` | API client: adds the login token, turns errors into readable messages |
| `lib/auth.tsx` | Auth context: login, sign-up, demo, logout |
| `lib/validation.ts` | Same completeness rules as the backend, so forms explain problems before saving |

The login token is kept in `localStorage`. The backend enforces every permission, so the client-side route guard is only for a smooth experience.
