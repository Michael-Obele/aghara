# Aghara MCP

A standalone **TMCP** (TypeScript MCP) server that remote-controls [Aghara](https://aghara.svelte-apps.me) — the social scheduler — over its REST API. Runs on **Fly.io** (Bun) and **Cloudflare Workers** from one codebase.

## Tools (3 — less than 7, resource-oriented)

| Tool              | Actions                                            |
| ----------------- | -------------------------------------------------- |
| `aghara_health`   | — (public status, no token needed)                 |
| `aghara_accounts` | `list`, `connect`, `disconnect`                    |
| `aghara_posts`    | `list`, `create`, `publish_now`, `cancel`, `retry` |

Every tool forwards to the Aghara REST API (`/api/v1/*`) with the configured Bearer token. No business logic lives here.

`create` mirrors `CreatePostSchema`: `body` up to 20000 chars plus optional `segments[]` (each ≤2000) for explicit threads. Token management is UI-only (never over MCP) — see `/docs/mcp` in the app.

## Environment

| Var                | Purpose                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------- |
| `AGHARA_BASE_URL`  | Aghara app URL — dev (`http://localhost:5173`) / prod (`https://aghara.svelte-apps.me`) |
| `AGHARA_API_TOKEN` | API token from the Aghara UI (API tokens page), forwarded as Bearer                     |
| `PORT`             | HTTP port (default `8000`)                                                              |

## Run locally

```bash
bun install
cp .env.example .env   # set AGHARA_BASE_URL + AGHARA_API_TOKEN
bun run dev
```

- MCP endpoint: `http://localhost:8000/mcp` (Streamable HTTP)
- Health: `http://localhost:8000/health`
- STDIO transport also starts in dev for local agent use.

## Install from npm (local editors, no hosting)

```bash
bunx aghara-mcp   # STDIO mode — set AGHARA_BASE_URL + AGHARA_API_TOKEN in env
```

Publish: `bun publish` from `mcp/` (runs `tsc` first via `prepublishOnly`). STDIO-only by default; pass `--http` (or set `PORT`) to also serve Streamable HTTP locally.

## Deploy to Fly.io (spin-down on inactivity)

```bash
cd mcp
fly launch --no-deploy      # first time, app name aghara-mcp
fly secrets set AGHARA_BASE_URL=https://aghara.svelte-apps.me AGHARA_API_TOKEN=<token>
fly deploy
```

`fly.toml` sets `auto_stop_machines = true` and `min_machines_running = 0`, so the machine stops when idle and wakes on the next request.

## Deploy to Cloudflare Workers

```bash
cd mcp
bun install
bunx wrangler login
bunx wrangler secret put AGHARA_API_TOKEN   # paste the token from the Aghara UI
bun run deploy
```

`wrangler.jsonc` sets `AGHARA_BASE_URL` (prod default) — override per environment with `wrangler secret put AGHARA_BASE_URL` if needed. Local test: `bun run dev:worker`, then point the MCP inspector at `http://localhost:8787/mcp`.

## Connect from a client

Point your MCP client at your deployed `/mcp` URL (Streamable HTTP). No auth on the MCP endpoint itself — the server forwards your `AGHARA_API_TOKEN` as `Authorization: Bearer <token>` on every REST call. See `/docs/mcp` in the app for per-client snippets (VS Code, Claude Desktop, Codex CLI).

## Check

```bash
bun run check   # tsc --noEmit
```
