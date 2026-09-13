<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Plug, Terminal, KeyRound, Server, CircleCheck } from '@lucide/svelte/icons';
	import McpConnect from '$lib/components/blocks/McpConnect.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	const tools = [
		{
			name: 'aghara_health',
			desc: 'Public status check. No token needed.',
			actions: ['—']
		},
		{
			name: 'aghara_accounts',
			desc: 'Connected channel accounts.',
			actions: ['list', 'connect', 'disconnect']
		},
		{
			name: 'aghara_posts',
			desc: 'Schedule, publish, cancel, retry. Body up to 20000 chars, optional segments[] for threads. Check aghara_platforms first.',
			actions: ['list', 'create', 'publish_now', 'cancel', 'retry']
		},
		{
			name: 'aghara_platforms',
			desc: 'Read-only limits matrix — call before create to warn about thread splits.',
			actions: ['—']
		}
	];
</script>

<svelte:head><title>MCP — control Aghara from agents — Aghara</title></svelte:head>

<div class="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-6">
	<div>
		<p class="flex items-center gap-2 text-sm text-muted-foreground">
			<Plug class="size-4" /> Model Context Protocol
		</p>
		<h1 class="mt-2 text-3xl font-semibold tracking-tight">
			Schedule social posts from your agent. No dashboard clicks.
		</h1>
		<p class="mt-2 text-muted-foreground">
			The Aghara MCP server is a thin forwarder over the REST API — no business logic lives in it.
			Start with the npm version over STDIO. Self-host HTTP only if you need remote access. Use a
			token from <a href="/tokens" class="underline">API tokens</a>.
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			<Button href="/tokens">Create API token</Button>
			<Button variant="outline" href="#npm">Copy npm setup</Button>
		</div>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<CircleCheck class="size-4" /> Three steps to connect
			</CardTitle>
			<CardDescription>One token, one command, posts on schedule.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-3 text-sm text-muted-foreground">
			<ol class="list-decimal space-y-1.5 pl-5">
				<li>
					Create a token at <a href="/tokens" class="underline">API tokens</a> — the raw secret is shown
					exactly once. Name it after what uses it (e.g. "my agent").
				</li>
				<li>
					Give the MCP server
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">AGHARA_BASE_URL</code>
					+
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">AGHARA_API_TOKEN</code>.
				</li>
				<li>
					Call <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">aghara_health</code>,
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">aghara_accounts</code>,
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">aghara_posts</code>. Check
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">aghara_platforms</code>
					before <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">create</code>.
				</li>
			</ol>
		</CardContent>
	</Card>

	<Card id="npm">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Terminal class="size-4" /> Recommended: run locally with
				<code class="rounded bg-muted px-1 py-0.5 font-mono text-sm">bunx aghara-mcp</code>
			</CardTitle>
			<CardDescription>No hosting required. STDIO for local editors.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-3 text-sm text-muted-foreground">
			<p>
				<Badge variant="secondary">Recommended</Badge>
				<span class="ml-2">
					Runs on your machine and talks to Aghara over REST. Works with VS Code, Claude Desktop,
					and Codex CLI via the STDIO config below.
				</span>
			</p>
			<ul class="list-disc space-y-1 pl-5">
				<li>
					Set
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">AGHARA_BASE_URL</code>
					to
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs"
						>https://aghara.svelte-apps.me</code
					>
					for prod,
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">http://localhost:5173</code>
					for dev.
				</li>
				<li>
					Set
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">AGHARA_API_TOKEN</code>
					to the token from Step 1.
				</li>
				<li>
					Default command is STDIO-only:
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">bunx aghara-mcp</code>. Add
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">--http</code>
					or set
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">PORT</code>
					only for local HTTP testing.
				</li>
			</ul>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"><Server class="size-4" /> Self-host HTTP</CardTitle
			>
			<CardDescription
				>Only if remote access is required. No public HTTP endpoint is hosted.</CardDescription
			>
		</CardHeader>
		<CardContent class="space-y-2 text-sm">
			<p>
				<Badge variant="secondary">Fly.io</Badge>
				<code class="ml-2 rounded bg-muted px-1 py-0.5 font-mono text-xs"
					>https://&lt;your-app&gt;.fly.dev/mcp</code
				>
			</p>
			<p>
				<Badge variant="secondary">Cloudflare</Badge>
				<code class="ml-2 rounded bg-muted px-1 py-0.5 font-mono text-xs"
					>https://aghara-mcp.&lt;your-account&gt;.workers.dev/mcp</code
				>
			</p>
			<p class="text-muted-foreground">
				Deploy <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">mcp/</code> yourself
				(see <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">mcp/README.md</code>),
				then set
				<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">AGHARA_BASE_URL</code>
				and
				<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">AGHARA_API_TOKEN</code>
				as secrets. Health check on
				<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">/health</code>. The MCP
				endpoint itself is open — the forwarded
				<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs"
					>Authorization: Bearer &lt;token&gt;</code
				>
				does the auth.
			</p>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"><Terminal class="size-4" /> Tools</CardTitle>
			<CardDescription
				>Four tools, one per domain. Tokens and billing stay in the UI.</CardDescription
			>
		</CardHeader>
		<CardContent class="space-y-4">
			{#each tools as t (t.name)}
				<div class="rounded-lg border p-4">
					<p class="flex items-center gap-2 font-mono text-sm font-medium">
						<CircleCheck class="size-3.5 text-muted-foreground" />
						{t.name}
					</p>
					<p class="mt-1 text-sm text-muted-foreground">{t.desc}</p>
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each t.actions as a (a)}
							<Badge variant="outline" class="font-mono text-xs">{a}</Badge>
						{/each}
					</div>
				</div>
			{/each}
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"><KeyRound class="size-4" /> API setup</CardTitle>
			<CardDescription>Where the Bearer token comes from and how it flows.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-3 text-sm text-muted-foreground">
			<ol class="list-decimal space-y-1.5 pl-5">
				<li>
					Create a token at <a href="/tokens" class="underline">API tokens</a> — the raw secret is shown
					exactly once. Name it after what uses it (e.g. "my agent").
				</li>
				<li>
					Give that token to the MCP server as
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">AGHARA_API_TOKEN</code>
					(env var locally, secret on Fly.io/Cloudflare). It is sent as
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs"
						>Authorization: Bearer &lt;token&gt;</code
					>
					on every REST call.
				</li>
				<li>
					Point the server at the app with
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">AGHARA_BASE_URL</code>
					(<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">http://localhost:5173</code>
					for dev,
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs"
						>https://aghara.svelte-apps.me</code
					>
					for prod).
				</li>
			</ol>
			<div class="rounded-md border bg-muted/40 p-3">
				<p class="mb-1 text-xs font-medium">Direct REST example (no MCP)</p>
				<pre
					class="overflow-x-auto font-mono text-xs">{`curl https://aghara.svelte-apps.me/api/v1/posts \\
  -H "Authorization: Bearer <token>"`}</pre>
			</div>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"><KeyRound class="size-4" /> Connect</CardTitle>
			<CardDescription>
				Start with npm — copy the STDIO config. HTTP tabs need your self-hosted URL.
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-3 text-sm">
			<ol class="list-decimal space-y-1.5 pl-5 text-muted-foreground">
				<li>Create a token at <a href="/tokens" class="underline">API tokens</a>.</li>
				<li>
					Paste it into
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">AGHARA_API_TOKEN</code>
					— it is sent as
					<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs"
						>Authorization: Bearer &lt;token&gt;</code
					>
					on every REST call.
				</li>
				<li>
					For HTTP only: point your client at your self-hosted endpoint above. The npm tab needs no
					URL.
				</li>
			</ol>
			<McpConnect endpoint="https://aghara-mcp.<your-account>.workers.dev/mcp" />
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"><Terminal class="size-4" /> Limits</CardTitle>
			<CardDescription>Check limits before scheduling.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-2 text-sm text-muted-foreground">
			<p>
				Call <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">aghara_platforms</code>
				first — it returns every channel's char limit plus
				<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">threads</code> /
				<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">sequentialSplit</code> flags.
			</p>
			<ul class="list-disc space-y-1 pl-5">
				<li>Bluesky 300 · Threads 500 · Mastodon 500 — over-limit auto-splits into a thread.</li>
				<li>Telegram 4096 · Discord 2000 — over-limit splits into sequential messages.</li>
				<li>
					LinkedIn 3000 — <span class="font-medium text-foreground">cannot split</span>; over-limit
					is rejected, trim first.
				</li>
			</ul>
		</CardContent>
	</Card>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">Start with the npm version</CardTitle>
			<CardDescription>Create one token, paste one config, schedule from the agent.</CardDescription
			>
		</CardHeader>
		<CardContent>
			<Button href="/tokens">Create API token</Button>
		</CardContent>
	</Card>
</div>
