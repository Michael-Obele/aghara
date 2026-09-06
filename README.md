# Aghara

> Your town crier for the internet. Write once, Aghara announces on schedule.

A Bluesky-first social scheduler in one SvelteKit app: UI + REST API + in-process
cron. Connect Bluesky, Telegram, Discord, Mastodon, LinkedIn and Threads; compose
once; Aghara posts on schedule with automatic retries.

- **Runtime:** Bun · **Framework:** SvelteKit 2 + Svelte 5 (runes) · **UI:** shadcn-svelte + Tailwind v4
- **DB:** Postgres via Drizzle + Neon (any Postgres works) · **Validation:** Valibot
- **Auth:** Better Auth (email/password + optional GitHub) · **Billing:** Lemon Squeezy (optional, `SELF_HOST=true` disables it)
- **Scheduler:** `Bun.cron` every minute, in-process — no Redis, no Temporal

## Quick start

```sh
bun install
cp .env.example .env   # fill in DATABASE_URL, BETTER_AUTH_SECRET, APP_ENCRYPTION_KEY
bun run db:migrate     # apply schema (or bun scripts/migrate.ts)
bun run dev
```

Open http://localhost:5173, register, connect Bluesky (handle + app password from
Bluesky → Settings → App passwords), and schedule your first post.

## Architecture

Three access layers share one service layer (`src/lib/server/services/*`):

```
PAGES (src/routes) --> remote functions ($lib/remote/*.remote.ts) --> SVC
REST  (src/routes/api/v1/*)  --> SVC   (Bearer tokens, for machines/agents)
CRON  (hooks.server.ts -> scheduler.ts) --> SVC
SVC --> Postgres (Drizzle) + providers (bluesky/telegram/discord/mastodon/linkedin/threads)
```

- Pages never call `/api/v1` — they use remote functions (`query`/`form`/`command`).
- REST never renders UI — JSON only, `Authorization: Bearer <token>`.
- Channel credentials are AES-256-GCM encrypted at rest (`APP_ENCRYPTION_KEY`).

## Environment

See [`.env.example`](./.env.example). Required: `DATABASE_URL`, `ORIGIN`,
`BETTER_AUTH_SECRET`, `APP_ENCRYPTION_KEY` (`openssl rand -hex 32`), `SELF_HOST`.
Optional: `GITHUB_CLIENT_ID/SECRET`, `LEMON_*` (billing), `THREADS_ENABLED`.

## REST API

Base `/api/v1`, JSON, Bearer token (create one in the app under **API tokens**).

| Method + path                                                  | Purpose                         |
| -------------------------------------------------------------- | ------------------------------- |
| `GET /api/v1/health`                                           | status + pending count (public) |
| `GET/POST /api/v1/accounts`, `DELETE /api/v1/accounts/:id`     | manage channel accounts         |
| `GET/POST /api/v1/posts`, `POST /api/v1/posts/:id/publish-now` | schedule + publish              |
| `DELETE /api/v1/scheduled/:id`                                 | cancel a queued post            |
| `GET/POST /api/v1/tokens`, `DELETE /api/v1/tokens/:id`         | API tokens                      |
| `POST /api/webhooks/lemonsqueezy`                              | billing webhook (HMAC)          |

## Deploy

The app ships as a single Docker image (`Dockerfile`) that runs migrations at boot
and then serves on port 8000. Health check: `/api/v1/health`.

**Koyeb** — create a Web Service from this repo (Dockerfile builder), free
instance, port 8000, health check `/api/v1/health`. Set the env vars above as
secrets. See [`koyeb.yaml`](./koyeb.yaml).

**Fly.io** — `fly launch` (uses [`fly.toml`](./fly.toml)), then
`fly secrets set DATABASE_URL=... BETTER_AUTH_SECRET=... APP_ENCRYPTION_KEY=... ORIGIN=https://aghara.fly.dev`.
The machine never auto-stops so the cron stays alive.

**Self-host** — set `SELF_HOST=true` and any Postgres `DATABASE_URL`; billing and
all plan limits are skipped (unlimited).

## Plans

Hosted: Creator $5 (5 accounts, 500/mo, API tokens) · Pro $8 (unlimited, 2000/mo, API tokens).
No free tier — every hosted account requires an active paid subscription. Self-hosted: unlimited, free.

## Project layout

- `src/lib/schemas/` — Valibot schemas shared by remote functions and REST
- `src/lib/server/services/` — accounts, posts, tokens, billing, publisher, crypto
- `src/lib/server/providers/` — one file per channel (`publish(input, credentials)`)
- `src/lib/remote/` — pages-only data layer (auth, accounts, posts, billing, tokens)
- `src/routes/api/v1/` — REST mirror (Bearer auth)
- `src/routes/(app)/` — dashboard, compose, schedule, accounts, billing, tokens
- `plan/` — original spec and design docs
