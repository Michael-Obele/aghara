# Aghara

> Your town crier for the internet. Write once, Aghara announces on schedule.

[![GitHub stars](https://img.shields.io/github/stars/Michael-Obele/aghara?style=flat)](https://github.com/Michael-Obele/aghara) [![Last commit](https://img.shields.io/github/last-commit/Michael-Obele/aghara)](https://github.com/Michael-Obele/aghara/commits) [![Issues](https://img.shields.io/github/issues/Michael-Obele/aghara)](https://github.com/Michael-Obele/aghara/issues)
[![Bun](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=white)](https://bun.sh) [![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev) [![Svelte 5](https://img.shields.io/badge/Svelte_5-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev) [![Tailwind v4](https://img.shields.io/badge/Tailwind_v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com) [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Drizzle](https://img.shields.io/badge/Drizzle-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team) [![Postgres](https://img.shields.io/badge/Postgres-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org) [![Better Auth](https://img.shields.io/badge/Better_Auth-000000)](https://www.better-auth.com) [![Valibot](https://img.shields.io/badge/Valibot-000000)](https://valibot.dev) [![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](./Dockerfile)
[![Bluesky](https://img.shields.io/badge/Bluesky-0285FF?logo=bluesky&logoColor=white)](https://bsky.app) [![Telegram](https://img.shields.io/badge/Telegram-26A5E4?logo=telegram&logoColor=white)](https://telegram.org) [![Discord](https://img.shields.io/badge/Discord-5865F2?logo=discord&logoColor=white)](https://discord.com) [![Mastodon](https://img.shields.io/badge/Mastodon-6364FF?logo=mastodon&logoColor=white)](https://joinmastodon.org) [![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white)](https://linkedin.com) [![Threads](https://img.shields.io/badge/Threads-000000?logo=threads&logoColor=white)](https://threads.net)
[![Self-host](https://img.shields.io/badge/Self--host-22c55e)](./koyeb.yaml) [![MCP-ready](https://img.shields.io/badge/MCP--ready-7c3aed)](./mcp/README.md)

**Try hosted:** https://aghara.svelte-apps.me · **Self-host:** Docker + any Postgres · **Agents:** `bunx aghara-mcp`

A Bluesky-first social scheduler in one SvelteKit app: UI + REST API + in-process
cron. Connect Bluesky, Telegram, Discord, Mastodon, LinkedIn and Threads; compose
once; Aghara posts on schedule with automatic retries.

## Why Aghara

- **Compose once, publish everywhere** — one body, per-platform threads and limits handled.
- **Set it and forget it** — per-minute scheduler with claim-then-publish and 3 retries.
- **Humans + agents** — dashboard for clicks, REST + MCP (`bunx aghara-mcp`) for code and agents.
- **One container, no queue** — no Redis or worker fleet; Postgres + `Bun.cron` is the stack.

## How it works

1. **Connect** a channel (Bluesky handle + app password, bot tokens for Telegram/Discord, etc.).
2. **Compose** once — optional `segments[]` for explicit threads.
3. **Aghara announces** on schedule, retries on failure, and tracks status per post.

## Quick start

```sh
bun install
cp .env.example .env   # fill in DATABASE_URL, BETTER_AUTH_SECRET, APP_ENCRYPTION_KEY
bun run db:migrate     # apply schema (or bun scripts/migrate.ts)
bun run dev
```

Open http://localhost:5173, register, connect Bluesky (handle + app password from
Bluesky → Settings → App passwords), and schedule your first post.

Control it your way: dashboard (`src/routes/(app)`), REST (`/api/v1` + Bearer token),
or agents (`mcp/` → `bunx aghara-mcp`). All three share `src/lib/server/services/*`.

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
- Services never import from routes. MCP tools forward to REST, no logic of their own.
- Channel credentials are AES-256-GCM encrypted at rest (`APP_ENCRYPTION_KEY`).

## Features

- **6 channels:** Bluesky, Telegram, Discord, Mastodon, LinkedIn, Threads.
- **Threads that fit:** Bluesky/Mastodon/Threads chain real reply-threads; Telegram/Discord split sequentially.
- **Reliable publishing:** per-minute `Bun.cron`, claim-then-publish, 3 retries per post.
- **Human + machine access:** dashboard (remote functions), REST (`/api/v1`), MCP (`bunx aghara-mcp`).
- **Secure by default:** Better Auth sessions for web, SHA-256 hashed Bearer tokens for API, encrypted credentials.
- **Host your way:** paid hosted with Lemon Squeezy billing, or `SELF_HOST=true` for unlimited self-host.

## Environment

See [`.env.example`](./.env.example). Required: `DATABASE_URL`, `ORIGIN`,
`BETTER_AUTH_SECRET`, `APP_ENCRYPTION_KEY` (`openssl rand -hex 32`), `SELF_HOST`.
Optional: `GITHUB_CLIENT_ID/SECRET`, `LEMON_*` (billing), `THREADS_ENABLED`.

Generate the encryption key with `openssl rand -hex 32`. Use any Postgres
`DATABASE_URL` — Neon pooled works, self-hosted Postgres works.

## REST API

Base `/api/v1`, JSON only. Create a token in the app under **API tokens**,
then send `Authorization: Bearer <token>`. Start with `GET /api/v1/health` (public).

| Method + path                                                  | Purpose                         |
| -------------------------------------------------------------- | ------------------------------- |
| `GET /api/v1/health`                                           | status + pending count (public) |
| `GET/POST /api/v1/accounts`, `DELETE /api/v1/accounts/:id`     | manage channel accounts         |
| `GET/POST /api/v1/posts`, `POST /api/v1/posts/:id/publish-now` | schedule + publish              |
| `DELETE /api/v1/scheduled/:id`                                 | cancel a queued post            |
| `GET/POST /api/v1/tokens`, `DELETE /api/v1/tokens/:id`         | API tokens                      |
| `POST /api/webhooks/lemonsqueezy`                              | billing webhook (HMAC)          |

Building an agent? Skip raw REST — use [`mcp/`](./mcp/README.md) (`bunx aghara-mcp`, 3 tools).

## Deploy

One Docker image (`Dockerfile`) runs migrations at boot, then serves on port 8000.
Health check: `/api/v1/health`.

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

Start here: https://aghara.svelte-apps.me — register, pick a plan, connect your first channel.

## Project layout

- `src/lib/schemas/` — Valibot schemas shared by remote functions and REST
- `src/lib/server/services/` — accounts, posts, tokens, billing, publisher, crypto
- `src/lib/server/providers/` — one file per channel (`publish(input, credentials)`)
- `src/lib/remote/` — pages-only data layer (auth, accounts, posts, billing, tokens)
- `src/routes/api/v1/` — REST mirror (Bearer auth)
- `src/routes/(app)/` — dashboard, compose, schedule, accounts, billing, tokens
- `mcp/` — standalone [`aghara-mcp`](https://www.npmjs.com/package/aghara-mcp) server (TMCP, Valibot, STDIO + HTTP)
- `plan/` — original spec and design docs
