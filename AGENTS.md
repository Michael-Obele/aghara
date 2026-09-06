# AGENTS.md — Aghara

> Town crier for the internet. Write once, Aghara announces on schedule.
> Bluesky-first social scheduler. One SvelteKit app: UI + REST API + in-process cron.

## Tech Stack & Architecture

- **Runtime & Tooling**: Bun only (`bun`, `bunx`). Never npm/pnpm/yarn.
- **Framework**: SvelteKit 2 + Svelte 5 (Runes: `$state`, `$props`, `$derived`, `$effect`). Runes forced in `svelte.config.js` (`compilerOptions.runes`), remote functions enabled via `kit.experimental.remoteFunctions`.
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, CSS in `src/routes/layout.css`). Prefer semantic tokens (`text-muted-foreground`). `cn()` in `src/lib/utils.ts` (clsx + tailwind-merge).
- **Database**: Drizzle ORM + `@neondatabase/serverless` (HTTP driver). Postgres (Neon hosted, any Postgres self-host). Singleton `db` in `src/lib/server/db/index.ts`. Tables in `src/lib/server/db/schema.ts` + Better Auth tables in `auth.schema.ts`.
- **Validation**: Valibot (`v.*` namespace). Shared schemas in `src/lib/schemas/` used by both remote functions and REST.
- **Authentication**: Better Auth (`better-auth/minimal` + `drizzleAdapter` + `sveltekitCookies` in `src/lib/server/auth.ts`). Email/password + optional GitHub OAuth. Session cookie for web (`event.locals.session/user` in `src/hooks.server.ts`); SHA-256 hashed Bearer `api_tokens` for REST/MCP.
- **Scheduler**: `Bun.cron` every minute, in-process (native Bun API, no dependency). `startScheduler()` in `src/lib/server/scheduler.ts`, started once from `src/hooks.server.ts` guarded by `globalThis.__aghara_scheduler` + `building` check. No-overlap is built in; after a sleep the next tick's `publishDue()` catches up all due rows.
- **Providers**: `src/lib/server/providers/<channel>.ts` each exporting `publish(input, credentials)`. Channels: `bluesky` (`@atproto/api` `BskyAgent`, core), `linkedin` / `threads` / `mastodon` / `telegram` / `discord` (optional). Credentials encrypted JSON (AES-GCM, `APP_ENCRYPTION_KEY` in `src/lib/server/services/crypto.ts`).
- **Billing**: Lemon Squeezy (plain fetch, no SDK) + webhook HMAC in `src/routes/api/webhooks/lemonsqueezy/+server.ts`. Plans: free / creator / pro. `SELF_HOST=true` disables billing (unlimited).
- **Icons**: Use `@lucide/svelte` (NEVER `lucide-svelte`). `import { IconName } from '@lucide/svelte'`. Sparingly, only for status/direction/action affordance. No decorative filler, no `Sparkles`/AI-style icons on buttons/headings/dropdowns. Prefer text-only dropdown options/tips/captions.
- **Components**: shadcn-svelte + Bits UI (`bits-ui`, `shadcn-svelte`, `svelte-sonner`, `formsnap`). Never hand-write `src/lib/components/ui/*`; always install via `bunx shadcn-svelte@latest add <component>`. Aliases in `components.json`: `$lib/components`, `$lib/utils`, `$lib/hooks`.

### The One Rule — Three Access Layers, One Service Layer

```
PAGES (src/routes) --> RF (src/lib/remote/*.remote.ts) --> SVC (src/lib/server/services/*)
MCP (mcp/, standalone TMCP on Fly.io) --> REST (src/routes/api/v1/*) --> SVC
CRON (hooks.server.ts -> scheduler.ts) -----------------> SVC
SVC --> DB (Drizzle) + PROV (providers/*)
```

- Pages NEVER `fetch('/api/v1/...')`. Pages use remote functions only.
- REST NEVER renders UI. JSON only, Bearer token auth.
- Services NEVER import from routes or remote files. Services import schemas, db, providers.
- MCP tools contain zero business logic. Thin forward to REST.
- Plan limits enforced in service layer (`src/lib/server/services/billing.ts`).

## Coding Conventions

### Quality Gate

- **Formatting**: Format only edited files. `bunx prettier --write <file>` then `bunx prettier --check <file>`. Never full-project format.
- **Typecheck**: Run `bun run check` (`svelte-kit sync && svelte-check`) immediately after substantive edits.
- **Errors**: Fix errors immediately; warnings only may be ignored. Use `<svelte:boundary>` for async loading/error states.

### Package Management

- Install via `bun add <package>` or `bunx <package>` for one-time use. Never edit `package.json` / `bun.lock` directly.
- Research before adding: Svelte 5 compat, bundle size, maintenance, alignment with existing stack (Drizzle, Better Auth, Valibot, Bits UI).

### Svelte 5 Runes

Always runes. Never legacy `export let` or `$:`.

- `$state(value)` / `$state.raw` for large non-deeply-reactive objects.
- `let { a, b } = $props()` for props; `$bindable()` for two-way.
- `$derived(expr)` / `$derived.by(() => ...)` for derived.
- `$effect(() => ...)` for DOM/timers only, not state sync. `$effect.pre` replaces `beforeUpdate`.
- `$inspect(value)` for dev debug only.
- Modern event attributes: `onclick`, `onsubmit`, `onchange`. Never `on:click`.
- `{@render children()}` + snippets, never `<slot />`. Render `<Comp />` directly, never `<svelte:component>`. Callback props, never `createEventDispatcher`. `mount()`, never `new Component()`. Prefer runes over stores. `import { page } from '$app/state'`, never `$app/stores`. Never `$$props`/`$$restProps`/`beforeUpdate`/`afterUpdate`/class components.

### Data Fetching & Mutations (Remote Functions)

Default to Remote Functions over `+page.server.ts` actions. `+page.server.ts` / `+layout.server.ts` ONLY for initial `load`.

- **Location**: `src/lib/remote/*.remote.ts` (`accounts.remote.ts`, `posts.remote.ts`, `billing.remote.ts`). Barrel `src/lib/remote/index.ts`.
- **Flavors**: `query` (reads, with `refresh()`/`loading`/`error`), `form` (mutations via `<form>` + `enhance`, bind with `form.fields.x.as('text')` or `bind:value`), `command` (button/script mutations without form), `prerender` (build-time).
- **Validation**: Always Valibot schema first arg (e.g. `form(CreatePostSchema, ...)`). Schemas live in `src/lib/schemas/` (`post.ts`: `CreatePostSchema`, `PublishNowSchema`; `account.ts`: `ConnectAccountSchema`; `token.ts`: `CreateTokenSchema`).
- **Auth**: Call `requireUserId()` from `$lib/server/session` first line inside every remote function.
- **No manual fetch wrappers**: No `async handleSubmit` calling remotes; let native submission / `enhance` handle it. Use `preflight(schema)` for client validation, `query.batch` for related reads, `submit().updates(query)` for post-mutation updates.
- **REST parity**: Every REST route in `src/routes/api/v1/*` validates with the same Valibot schema + calls the same service function as its remote counterpart. Auth via `Authorization: Bearer <token>` (see `src/lib/server/api.ts`).

### Database Access

- Singleton `db` from `$lib/server/db`. No new clients per request.
- Schema changes: `bun run db:push` (prototype), `bun run db:migrate` (stable), `bun run db:generate` + `bun run db:studio` to inspect. Auth tables: `bun run auth:schema` regenerates `auth.schema.ts` — do not hand-edit.
- `drizzle.config.ts` requires `DATABASE_URL`; schema path `./src/lib/server/db/schema.ts`, dialect `postgresql`.
- Env: `DATABASE_URL`, `ORIGIN`, `BETTER_AUTH_SECRET`, optional `GITHUB_CLIENT_ID/SECRET`, `APP_ENCRYPTION_KEY`, Lemon Squeezy keys, `SELF_HOST`. See `.env.example`.

### Accessibility (AAA)

Every page/route must pass WCAG AAA before done: contrast, legible size/weight, clear hierarchy, no tiny/faint content. Audit after any page/route change and fix before finalizing.

### Styling & UI Design

- NEVER gradients. Solid colors, clean minimalist layout.
- Tailwind v4 semantic tokens only. No hardcoded HSL/Hex in components.
- Responsive via standard prefixes (`lg:`, `md:`).
- Conditional classes via `cn(...)` from `$lib/utils`.

## Key Files & Directories

- `src/lib/schemas/`: Valibot schemas shared by remote + REST.
- `src/lib/server/db/`: `index.ts` (singleton), `schema.ts` (app tables), `auth.schema.ts` (generated).
- `src/lib/server/services/`: `posts.ts` (`createPost`, `listScheduled`, `publishNow`, `cancelScheduled`), `accounts.ts`, `tokens.ts` (hash + show-once), `billing.ts` (`getPlan`, `checkLimit`), `publisher.ts` (`publishDue`, claim-then-publish, 3 retries), `crypto.ts`, `errors.ts`.
- `src/lib/server/providers/`: one file per channel, `publish(input, credentials)`.
- `src/lib/server/`: `auth.ts` (Better Auth), `api.ts` (Bearer helper), `session.ts` (`requireUserId`), `scheduler.ts`.
- `src/lib/remote/`: pages-only data layer. Never imported by services or REST.
- `mcp/`: standalone TMCP server (TypeScript, `tmcp` SDK + Valibot adapter). 3 tools (`aghara_health`, `aghara_accounts`, `aghara_posts`) forwarding to REST. Own `package.json`/`fly.toml`; deploys to Fly.io with spin-down on inactivity. Env: `AGHARA_BASE_URL` (swap dev/prod), `AGHARA_API_TOKEN` (from the UI tokens page).
- `src/lib/components/ui/`: CLI-generated only. `src/lib/components/`: shared in `blocks/`, route-specific in route-named folders.
- `src/routes/api/v1/`: `health` (public GET), `accounts`, `posts`, `scheduled/[id]`, `tokens` (JSON only).
- Admin: `bun run seed:admin` creates/updates `admin@svelte-apps.me` (env `ADMIN_EMAIL`/`ADMIN_PASSWORD`) with `role=admin` + a pro-for-life subscription. Admin always gets the pro plan (`isAdmin` in `src/lib/server/services/billing.ts`) and bypasses plan limits.
- `src/routes/api/webhooks/lemonsqueezy/+server.ts`: raw body + `X-Signature` HMAC.
- `src/routes/api/auth/[...all]/+server.ts`: Better Auth mount.
- `src/hooks.server.ts`: Better Auth handler + single scheduler start.
- `drizzle.config.ts`, `drizzle/`, `vite.config.ts` (runes forced), `components.json`, `plan/` (spec source of truth).

## Common Workflows

- **Dev**: `bun run dev` (never run this command let the user run it!)
- **Check**: `bun run check`
- **Lint/format edited files**: `bunx prettier --check <file>` / `bunx prettier --write <file>`
- **Build/preview**: `bun run build` / `bun run preview` (never run this command let the user run it!)
- **DB**: `bun run db:push` | `bun run db:generate` | `bun run db:migrate` | `bun run db:studio`
- **Auth schema**: `bun run auth:schema`

## AI Agent Integration

- **Memory**: Persist durable context (decisions, conventions, stack choices) via Memory MCP; read before starting non-trivial work.
- **Docs**: Use Svelte MCP `get-documentation` for Svelte 5/Kit APIs and `svelte-autofixer` to validate `.svelte` files before finalizing.
- **shadcn-svelte**: Never author UI primitives manually. Use CLI commands from MCP docs / trusted research to add/update.
