# Aghara MCP

[![npm version](https://img.shields.io/npm/v/aghara-mcp)](https://www.npmjs.com/package/aghara-mcp) [![npm downloads](https://img.shields.io/npm/dm/aghara-mcp)](https://www.npmjs.com/package/aghara-mcp) [![GitHub stars](https://img.shields.io/github/stars/Michael-Obele/aghara?style=flat)](https://github.com/Michael-Obele/aghara)
[![Bun](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=white)](https://bun.sh) [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org) [![TMCP](https://img.shields.io/badge/TMCP-7c3aed)](https://github.com/tmcp-js/tmcp) [![Valibot](https://img.shields.io/badge/Valibot-000000)](https://valibot.dev)
[![Streamable HTTP + STDIO](https://img.shields.io/badge/Transport-HTTP_+_STDIO-0ea5e9)](https://modelcontextprotocol.io) [![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white)](./wrangler.jsonc) [![Fly.io](https://img.shields.io/badge/Fly.io-7B3FF2?logo=flydotio&logoColor=white)](./fly.toml)

**Recommended:** `bunx aghara-mcp` (STDIO, no hosting) · **Self-host:** `/mcp` (HTTP) · **Needs:** `AGHARA_BASE_URL` + `AGHARA_API_TOKEN`

A standalone **TMCP** (TypeScript MCP) server that remote-controls [Aghara](https://aghara.svelte-apps.me) — the social scheduler — over its REST API. Start locally with zero hosting, or self-host on **Fly.io** (Bun) or **Cloudflare Workers** from one codebase. Schedule, publish, and manage posts from any MCP client — no dashboard clicks.

## Why this exists

- **Post from your agent** — schedule and publish without opening the dashboard.
- **Thin by design** — 4 tools forward to `/api/v1/*`; no logic to drift.
- **Start local** — STDIO for VS Code, Claude Desktop, Codex CLI. No server to run.
- **Self-host if remote** — HTTP for hosted clients, Workers or Fly for deploy.

## How it works

1. **Create a token** in Aghara UI under API tokens.
2. **Run locally** via `bunx aghara-mcp` (STDIO, recommended) — no hosting.
3. **Call 4 tools** — `aghara_health`, `aghara_accounts`, `aghara_posts`, `aghara_platforms` — done. Self-host HTTP only for remote access.

## Tools (4 — resource-oriented)

| Tool               | Actions                                            |
| ------------------ | -------------------------------------------------- |
| `aghara_health`    | — (public status, no token needed)                 |
| `aghara_accounts`  | `list`, `connect`, `disconnect`                    |
| `aghara_posts`     | `list`, `create`, `publish_now`, `cancel`, `retry` |
| `aghara_platforms` | — (limits matrix, call before `create`)            |

Every tool forwards to the Aghara REST API (`/api/v1/*`) with the configured Bearer token. No business logic lives here.

`create` mirrors `CreatePostSchema`: `body` up to 20000 chars plus optional `segments[]` (each ≤2000) for explicit threads. Token management is UI-only (never over MCP) — see `/docs/mcp` in the app.

## Environment

| Var                | Purpose                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------- |
| `AGHARA_BASE_URL`  | Aghara app URL — dev (`http://localhost:5173`) / prod (`https://aghara.svelte-apps.me`) |
| `AGHARA_API_TOKEN` | API token from the Aghara UI (API tokens page), forwarded as Bearer                     |
| `PORT`             | HTTP port (default `8000`)                                                              |

## Recommended: install from npm (local editors, no hosting)

```bash
bunx aghara-mcp   # STDIO-only by default — set AGHARA_BASE_URL + AGHARA_API_TOKEN in env
```

Paste into your MCP client config (Claude Desktop, VS Code, Codex CLI):

```json
{
	"mcpServers": {
		"aghara": {
			"command": "bunx",
			"args": ["aghara-mcp"],
			"env": {
				"AGHARA_BASE_URL": "https://aghara.svelte-apps.me",
				"AGHARA_API_TOKEN": "<paste-token-from-/tokens>"
			}
		}
	}
}
```

- Prod: `AGHARA_BASE_URL=https://aghara.svelte-apps.me` · Dev: `http://localhost:5173`
- Pass `--http` (or set `PORT`) only for local HTTP testing.
- Publish: `bun publish` from `mcp/` (runs `tsc` first via `prepublishOnly`).

## Develop locally

```bash
bun install
cp .env.example .env   # set AGHARA_BASE_URL + AGHARA_API_TOKEN
bun run dev
```

- MCP endpoint: `http://localhost:8000/mcp` (Streamable HTTP)
- Health: `http://localhost:8000/health`
- STDIO transport also starts in dev for local agent use.

## Self-host HTTP (only if remote access is required)

No public HTTP endpoint is hosted. Deploy `mcp/` yourself, then point clients at your `/mcp` URL.

### Deploy to Fly.io (spin-down on inactivity)

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

Start with npm (STDIO) — no URL needed. For self-hosted HTTP only: point your MCP client at your deployed `/mcp` URL (Streamable HTTP). No auth on the MCP endpoint itself — the server forwards your `AGHARA_API_TOKEN` as `Authorization: Bearer <token>` on every REST call. See `/docs/mcp` in the app for per-client snippets (npm, VS Code, Claude Desktop, Codex CLI).

## Check

```bash
bun run check   # tsc --noEmit
```
