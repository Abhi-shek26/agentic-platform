# RUN — the only doc you need to run the platform

## One-command run (canonical)

```bash
cd agentic-platform
docker compose up --build
```

Open **http://localhost:5000** (frontend + API served together).
The compose stack starts postgres + redis + app with healthchecks.
`MOCK_AGENTS` defaults to `true` (free demo, no AI cost).
Your `.env` is loaded into the container automatically (`env_file`).

## Real AI generation (Qubrid, your $5 credit)

In `.env`:

```bash
MOCK_AGENTS=false
QUBRID_API_KEY=k_...            # keep secret, never commit (.env is gitignored)
QUBRID_MODEL=deepseek-ai/DeepSeek-V4-Flash        # planning agents
QUBRID_CODE_MODEL=Qwen/Qwen3-Coder-Flash          # code agents (3-5x cheaper)
```

Restart: `docker compose up --build`. Each site ≈ 50–110k tokens
(~4 min). Use mock for dev, real only for demos.

## Local dev (no Docker)

Needs local postgres + redis running.

```bash
npm install
cp .env.example .env   # fill secrets
npm run db:push
npm run dev:full       # API :5000 + Vite :5173 (proxies /api → :5000)
```

## URLs

| What | URL |
|---|---|
| App | http://localhost:5000 (docker) or :5173 (local dev) |
| Health | GET http://localhost:5000/health |
| Live site | http://localhost:5000/sites/:projectId (public, no login) |

## Workflow

1. Sign up → token stored, dashboard opens
2. Create project (tournament form; slug auto-generated)
3. Generate My Website → watch 8 agents (2–4 min mock, ~4 min real)
4. Completed → **Publish Live Site** (platform hosting, instant) or
   **Deploy to Vercel** (needs `VERCEL_TOKEN` in `.env` or paste in UI) or
   **Download Code** (full React+Express+Postgres source ZIP)

## Env reference

| Var | Purpose | Default |
|---|---|---|
| `MOCK_AGENTS` | `true` = free fake code, `false` = real Qubrid | `true` (compose) |
| `QUBRID_API_KEY` | AI key (secret) | — |
| `QUBRID_MODEL` / `QUBRID_CODE_MODEL` | planning / code models | DeepSeek-V4-Flash / Qwen3-Coder-Flash |
| `VERCEL_TOKEN` | one-click Vercel deploy (optional) | — |
| `DATABASE_URL` / `REDIS_URL` | overridden by compose to service DNS | localhost (local dev) |
| `SESSION_SECRET` | sessions | dev fallback (change in prod) |

## Troubleshooting

- `docker compose up` fails on ports → `docker compose down`, free :5000/:5432/:6379
- Generation stuck at 0% → redis not healthy: `docker compose ps`, `docker compose logs redis`
- Login loops / 401 → clear `localStorage.authToken`, sign up fresh
- Real AI errors `No complete JSON` → model truncated; retry (reasoning length varies)
- Data lost on restart (local dev) → expected: dev uses in-memory storage; compose postgres persists via volume

Older docs (`QUICKSTART.md`, `DEPLOY_NOW.md`, `DEPLOYMENT_GUIDE.md`) are
superseded by this file.
