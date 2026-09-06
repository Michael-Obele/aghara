# Aghara MCP

A standalone **TMCP** (TypeScript MCP) server that remote-controls [Aghara](https://aghara.fly.dev) — the social scheduler — over its REST API. Hosted on Fly.io with spin-down on inactivity.

## Tools (3 — less than 7, resource-oriented)

| Tool              | Actions                                   |
| ----------------- | ----------------------------------------- |
| `aghara_health`   | — (public status, no token needed)        |
| `aghara_accounts` | `list`, `connect`, `disconnect`           |
| `aghara_posts`    | `list`, `create`, `publish_now`, `cancel` |

Every tool forwards to the Aghara REST API (`/api/v1/*`) with the configured Bearer token. No business logic lives here.

## Environment

| Var                | Purpose                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `AGHARA_BASE_URL`  | Aghara app URL — swap for dev (`http://localhost:5173`) / prod (`https://aghara.fly.dev`) |
| `AGHARA_API_TOKEN` | API token from the Aghara UI (Settings → API tokens)                                      |
| `PORT`             | HTTP port (default `8000`)                                                                |

## Run locally

```bash
bun install
cp .env.example .env   # set AGHARA_BASE_URL + AGHARA_API_TOKEN
bun run dev
```

- MCP endpoint: `http://localhost:8000/mcp` (Streamable HTTP)
- Health: `http://localhost:8000/health`
- STDIO transport also starts in dev for local agent use.

## Deploy to Fly.io (spin-down on inactivity)

```bash
cd mcp
fly launch --no-deploy      # first time, app name aghara-mcp
fly secrets set AGHARA_BASE_URL=https://aghara.fly.dev AGHARA_API_TOKEN=<token>
fly deploy
```

`fly.toml` sets `auto_stop_machines = true` and `min_machines_running = 0`, so the machine stops when idle and wakes on the next request.

## Connect from a client

Point your MCP client at `https://aghara-mcp.fly.dev/mcp` (Streamable HTTP). No auth on the MCP endpoint itself — the API token it forwards is the auth.

## Check

```bash
bun run check   # tsc --noEmit
```
