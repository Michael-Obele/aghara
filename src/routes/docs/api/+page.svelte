<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import {
		BookOpen,
		KeyRound,
		Globe,
		Server,
		Terminal,
		CircleCheck,
		Copy,
		Check,
		Braces,
		ShieldCheck,
		Timer,
		ListTree,
		CalendarClock,
		Plug
	} from '@lucide/svelte/icons';

	const baseUrl = 'https://aghara.svelte-apps.me';
	const devUrl = 'http://localhost:5173';

	let copied = $state<string | null>(null);
	let quickstartTab = $state('curl');

	async function copyText(id: string, text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = id;
			setTimeout(() => {
				copied = null;
			}, 1500);
		} catch {
			copied = null;
		}
	}

	const curlQuickstart = `curl ${baseUrl}/api/v1/posts \\
  -H "Authorization: Bearer <token>"`;

	const jsQuickstart = `const res = await fetch("${baseUrl}/api/v1/posts", {
  headers: { Authorization: "Bearer <token>" }
});
const posts = await res.json();`;

	const curlCreate = `curl -X POST ${baseUrl}/api/v1/posts \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "body": "We just shipped the new dashboard.",
    "timezone": "Africa/Nairobi",
    "targets": [
      { "channelAccountId": "<account-id>", "runAt": "2026-09-20T09:00:00.000Z" }
    ]
  }'`;

	const createResponse = `{
  "postId": "3f2b1c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  "scheduledIds": ["7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d"]
}`;

	const curlThread = `curl -X POST ${baseUrl}/api/v1/posts \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "body": "Full announcement text here.",
    "segments": ["Part 1: the news.", "Part 2: the detail.", "Part 3: the link."],
    "timezone": "Africa/Nairobi",
    "targets": [
      { "channelAccountId": "<bluesky-account-id>", "runAt": "2026-09-20T09:00:00.000Z" }
    ]
  }'`;

	const curlBlueskyConnect = `curl -X POST ${baseUrl}/api/v1/accounts \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "bluesky",
    "handle": "you.bsky.social",
    "appPassword": "xxxx-xxxx-xxxx-xxxx"
  }'`;

	const curlToken = `curl -X POST ${baseUrl}/api/v1/tokens \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "my-agent" }'`;

	const errorShape = `{
  "error": "NOT_FOUND",
  "message": "Scheduled post not found"
}`;

	const healthResponse = `{
  "status": "ok",
  "version": "0.1.0",
  "pending": 3
}`;

	const platformsResponse = `[
  { "channel": "bluesky", "name": "Bluesky", "maxLength": 300,
    "features": { "threads": true, "sequentialSplit": false } },
  { "channel": "telegram", "name": "Telegram", "maxLength": 4096,
    "features": { "threads": false, "sequentialSplit": true } }
]`;

	const nav = [
		{ href: '#quickstart', label: 'Quickstart' },
		{ href: '#auth', label: 'Auth' },
		{ href: '#base', label: 'Base URL + errors' },
		{ href: '#health', label: 'Health' },
		{ href: '#platforms', label: 'Platforms' },
		{ href: '#accounts', label: 'Accounts' },
		{ href: '#posts', label: 'Posts' },
		{ href: '#scheduled', label: 'Scheduled' },
		{ href: '#tokens', label: 'Tokens' },
		{ href: '#limits', label: 'Limits' },
		{ href: '#errors', label: 'Errors' }
	];

	const errorRows = [
		{ code: 'VALIDATION_ERROR', status: '400', when: 'Body does not match the schema.' },
		{ code: 'UNAUTHORIZED', status: '401', when: 'Missing, invalid, or revoked token.' },
		{ code: 'NOT_FOUND', status: '404', when: 'The id does not exist or is not yours.' },
		{ code: 'PLAN_REQUIRED', status: '402', when: 'Hosted user has no active paid plan.' },
		{ code: 'LIMIT_EXCEEDED', status: '402', when: 'Plan quota for accounts or posts is full.' },
		{ code: 'TOKENS_NOT_INCLUDED', status: '403', when: 'Plan does not include API tokens.' },
		{ code: 'PAST_RUN_AT', status: '400', when: 'runAt is not in the future.' },
		{ code: 'INVALID_RUN_AT', status: '400', when: 'runAt is not an ISO instant with offset.' },
		{ code: 'INVALID_TIMEZONE', status: '400', when: 'timezone is not a known IANA zone.' },
		{ code: 'TOO_LONG', status: '400', when: 'Text exceeds a single-post platform limit.' },
		{ code: 'NOT_QUEUED', status: '409', when: 'Publish or cancel on a non-queued row.' },
		{ code: 'NOT_FAILED', status: '409', when: 'Retry on a row that did not fail.' },
		{ code: 'NOT_EDITABLE', status: '409', when: 'Edit on a row that already sent.' },
		{ code: 'DUPLICATE_ACCOUNT', status: '409', when: 'That account is already connected.' },
		{ code: 'PROVIDER_ERROR', status: '502', when: 'The network rejected the publish.' }
	];

	const limitRows = [
		{ channel: 'Bluesky', limit: '300', behavior: 'Real reply thread' },
		{ channel: 'Threads', limit: '500', behavior: 'Real reply thread' },
		{ channel: 'Mastodon', limit: '500', behavior: 'Real reply thread' },
		{ channel: 'Telegram', limit: '4096', behavior: 'Sequential messages' },
		{ channel: 'Discord', limit: '2000', behavior: 'Sequential messages' },
		{ channel: 'LinkedIn', limit: '3000', behavior: 'Single post, over-limit rejected' }
	];
</script>

<svelte:head><title>API reference — Aghara</title></svelte:head>

<div class="mx-auto max-w-6xl px-4 py-10 md:px-6">
	<div class="max-w-3xl">
		<p class="flex items-center gap-2 text-sm text-muted-foreground">
			<BookOpen class="size-4" /> REST API reference
		</p>
		<h1 class="mt-2 text-3xl font-semibold tracking-tight">Post from code, not from tabs.</h1>
		<p class="mt-2 text-muted-foreground">
			The REST API does what the app does. Queue posts, publish now, cancel, retry. One bearer
			token. JSON in, JSON out.
		</p>
		<div class="mt-4 flex flex-wrap gap-2">
			<Button href="/tokens">Create API token</Button>
			<Button variant="outline" href="/docs/mcp">MCP docs for agents</Button>
		</div>
	</div>

	<div class="mt-6 flex gap-2 overflow-x-auto pb-2 lg:hidden" aria-label="On this page">
		{#each nav as item (item.href)}
			<a
				href={item.href}
				class="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
			>
				{item.label}
			</a>
		{/each}
	</div>

	<div class="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
		<nav class="hidden lg:block" aria-label="On this page">
			<div class="sticky top-24 space-y-1 text-sm">
				<p class="px-3 pb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
					On this page
				</p>
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class="block rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
					>
						{item.label}
					</a>
				{/each}
			</div>
		</nav>

		<div class="min-w-0 space-y-8">
			<Card id="quickstart">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Terminal class="size-4" /> Quickstart
					</CardTitle>
					<CardDescription>One token, one call, your queue back.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3 text-sm text-muted-foreground">
					<ol class="list-decimal space-y-1.5 pl-5">
						<li>
							Create a token at <a href="/tokens" class="underline">API tokens</a>. The raw secret
							shows exactly once. Name it after what uses it.
						</li>
						<li>
							Send it as
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs"
								>Authorization: Bearer &lt;token&gt;</code
							>.
						</li>
						<li>List your queue. If it returns JSON, you are in.</li>
					</ol>
					<Tabs.Root bind:value={quickstartTab}>
						<Tabs.List>
							<Tabs.Trigger value="curl">curl</Tabs.Trigger>
							<Tabs.Trigger value="js">JavaScript</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="curl">
							<div class="rounded-md border bg-muted/40 p-3">
								<div class="mb-2 flex items-center justify-between">
									<p class="text-xs font-medium">List scheduled posts</p>
									<Button
										size="sm"
										variant="outline"
										class="gap-1.5"
										onclick={() => copyText('quick-curl', curlQuickstart)}
									>
										{#if copied === 'quick-curl'}
											<Check class="size-3.5" /> Copied
										{:else}
											<Copy class="size-3.5" /> Copy
										{/if}
									</Button>
								</div>
								<pre class="overflow-x-auto font-mono text-xs">{curlQuickstart}</pre>
							</div>
						</Tabs.Content>
						<Tabs.Content value="js">
							<div class="rounded-md border bg-muted/40 p-3">
								<div class="mb-2 flex items-center justify-between">
									<p class="text-xs font-medium">List scheduled posts</p>
									<Button
										size="sm"
										variant="outline"
										class="gap-1.5"
										onclick={() => copyText('quick-js', jsQuickstart)}
									>
										{#if copied === 'quick-js'}
											<Check class="size-3.5" /> Copied
										{:else}
											<Copy class="size-3.5" /> Copy
										{/if}
									</Button>
								</div>
								<pre class="overflow-x-auto font-mono text-xs">{jsQuickstart}</pre>
							</div>
						</Tabs.Content>
					</Tabs.Root>
				</CardContent>
			</Card>

			<Card id="auth">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<KeyRound class="size-4" /> Auth
					</CardTitle>
					<CardDescription>Bearer tokens. No cookies, no sessions for machines.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3 text-sm text-muted-foreground">
					<p>
						Every <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">/api/v1/*</code>
						route except
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">GET /api/v1/health</code>
						needs
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs"
							>Authorization: Bearer &lt;token&gt;</code
						>. Tokens are SHA-256 hashed at rest. The raw secret shows once at creation.
					</p>
					<ul class="list-disc space-y-1 pl-5">
						<li>Token routes also accept a web session. Everything else needs Bearer.</li>
						<li>Revoked tokens return <code class="font-mono text-xs">UNAUTHORIZED</code>.</li>
						<li>Credentials are never returned by any endpoint.</li>
					</ul>
				</CardContent>
			</Card>

			<Card id="base">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Globe class="size-4" /> Base URL + error shape
					</CardTitle>
					<CardDescription>Same app, two addresses. Same JSON when things fail.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3 text-sm text-muted-foreground">
					<div class="grid gap-2 sm:grid-cols-2">
						<div class="rounded-md border bg-muted/40 p-3">
							<p class="text-xs font-medium">Production</p>
							<p class="mt-1 font-mono text-xs">{baseUrl}</p>
						</div>
						<div class="rounded-md border bg-muted/40 p-3">
							<p class="text-xs font-medium">Local dev</p>
							<p class="mt-1 font-mono text-xs">{devUrl}</p>
						</div>
					</div>
					<p>
						Errors always return
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs"
							>{'{ error, message }'}</code
						>
						with the HTTP status that fits.
					</p>
					<pre
						class="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">{errorShape}</pre>
				</CardContent>
			</Card>

			<Card id="health">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Server class="size-4" /> Health
					</CardTitle>
					<CardDescription>Public. No token. For uptime checks and agents.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge variant="secondary" class="font-mono">GET</Badge>
							<code class="font-mono text-sm">/api/v1/ping</code>
							<Badge variant="outline">Public</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Liveness only — answers whether the app can serve HTTP, without touching the database.
							This is what our deploy health checks hit, so a database blip can't restart a healthy
							instance.
						</p>
					</div>
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge variant="secondary" class="font-mono">GET</Badge>
							<code class="font-mono text-sm">/api/v1/health</code>
							<Badge variant="outline">Public</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							The deep check: status, version, and queued count, verified against the database and
							the scheduler (503 when down). Use it before scheduling, or from an agent.
						</p>
						<pre
							class="mt-3 overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">{healthResponse}</pre>
					</div>
				</CardContent>
			</Card>

			<Card id="platforms">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Globe class="size-4" /> Platforms
					</CardTitle>
					<CardDescription>Call this before create. It tells you what fits.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge variant="secondary" class="font-mono">GET</Badge>
							<code class="font-mono text-sm">/api/v1/platforms</code>
							<Badge variant="outline">Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Returns every channel with its character limit and thread behavior. Check
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">threads</code>
							and
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">sequentialSplit</code>
							before warning about splits.
						</p>
						<pre
							class="mt-3 overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">{platformsResponse}</pre>
					</div>
				</CardContent>
			</Card>

			<Card id="accounts">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Plug class="size-4" /> Accounts
					</CardTitle>
					<CardDescription>Connect once in the UI or here. Then post by id.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge variant="secondary" class="font-mono">GET</Badge>
							<code class="font-mono text-sm">/api/v1/accounts</code>
							<Badge variant="outline">Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Lists your connected accounts. Each has an id, channel, and label. No credentials are
							ever returned.
						</p>
					</div>
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge class="font-mono">POST</Badge>
							<code class="font-mono text-sm">/api/v1/accounts</code>
							<Badge variant="outline">Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Connects an account. Credentials are verified at connect time, then encrypted. Fields
							differ per channel.
						</p>
						<div class="mt-3 overflow-x-auto rounded-md border">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Channel</Table.Head>
										<Table.Head>Fields</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									<Table.Row>
										<Table.Cell class="font-mono text-xs">bluesky</Table.Cell>
										<Table.Cell class="font-mono text-xs">handle, appPassword</Table.Cell>
									</Table.Row>
									<Table.Row>
										<Table.Cell class="font-mono text-xs">telegram</Table.Cell>
										<Table.Cell class="font-mono text-xs">botToken, chatId</Table.Cell>
									</Table.Row>
									<Table.Row>
										<Table.Cell class="font-mono text-xs">discord</Table.Cell>
										<Table.Cell class="font-mono text-xs">webhookUrl</Table.Cell>
									</Table.Row>
									<Table.Row>
										<Table.Cell class="font-mono text-xs">mastodon</Table.Cell>
										<Table.Cell class="font-mono text-xs">instanceUrl, accessToken</Table.Cell>
									</Table.Row>
									<Table.Row>
										<Table.Cell class="font-mono text-xs">linkedin</Table.Cell>
										<Table.Cell class="font-mono text-xs">accessToken</Table.Cell>
									</Table.Row>
									<Table.Row>
										<Table.Cell class="font-mono text-xs">threads</Table.Cell>
										<Table.Cell class="font-mono text-xs">accessToken, userId</Table.Cell>
									</Table.Row>
								</Table.Body>
							</Table.Root>
						</div>
						<div class="mt-3 rounded-md border bg-muted/40 p-3">
							<div class="mb-2 flex items-center justify-between">
								<p class="text-xs font-medium">Example: connect Bluesky</p>
								<Button
									size="sm"
									variant="outline"
									class="gap-1.5"
									onclick={() => copyText('bluesky', curlBlueskyConnect)}
								>
									{#if copied === 'bluesky'}
										<Check class="size-3.5" /> Copied
									{:else}
										<Copy class="size-3.5" /> Copy
									{/if}
								</Button>
							</div>
							<pre class="overflow-x-auto font-mono text-xs">{curlBlueskyConnect}</pre>
						</div>
					</div>
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge variant="destructive" class="font-mono">DELETE</Badge>
							<code class="font-mono text-sm">/api/v1/accounts/[id]</code>
							<Badge variant="outline">Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Disconnects the account. Queued posts targeting it are canceled.
						</p>
					</div>
				</CardContent>
			</Card>

			<Card id="posts">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<CalendarClock class="size-4" /> Posts
					</CardTitle>
					<CardDescription>Queue once. One post can target many accounts.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge variant="secondary" class="font-mono">GET</Badge>
							<code class="font-mono text-sm">/api/v1/posts?status=queued</code>
							<Badge variant="outline">Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Lists scheduled rows newest first. Filter with
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">status</code>: queued,
							posted, failed, or canceled. Each row carries body, segments, channel, runAt,
							timezone, status, attempts, lastError, and posted URLs.
						</p>
					</div>
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge class="font-mono">POST</Badge>
							<code class="font-mono text-sm">/api/v1/posts</code>
							<Badge variant="outline">Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Creates one post with one or more targets. Body holds up to 20000 characters. Pass
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">segments[]</code>
							for an explicit thread. Each target needs a channel account id and a future
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">runAt</code>
							instant with a UTC offset. Timezone is an IANA name and defaults to UTC.
						</p>
						<div class="mt-3 rounded-md border bg-muted/40 p-3">
							<div class="mb-2 flex items-center justify-between">
								<p class="text-xs font-medium">Example: schedule one post</p>
								<Button
									size="sm"
									variant="outline"
									class="gap-1.5"
									onclick={() => copyText('create', curlCreate)}
								>
									{#if copied === 'create'}
										<Check class="size-3.5" /> Copied
									{:else}
										<Copy class="size-3.5" /> Copy
									{/if}
								</Button>
							</div>
							<pre class="overflow-x-auto font-mono text-xs">{curlCreate}</pre>
						</div>
						<pre
							class="mt-3 overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">{createResponse}</pre>
						<div class="mt-3 rounded-md border bg-muted/40 p-3">
							<div class="mb-2 flex items-center justify-between">
								<p class="text-xs font-medium">Example: explicit thread</p>
								<Button
									size="sm"
									variant="outline"
									class="gap-1.5"
									onclick={() => copyText('thread', curlThread)}
								>
									{#if copied === 'thread'}
										<Check class="size-3.5" /> Copied
									{:else}
										<Copy class="size-3.5" /> Copy
									{/if}
								</Button>
							</div>
							<pre class="overflow-x-auto font-mono text-xs">{curlThread}</pre>
						</div>
					</div>
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge class="font-mono">POST</Badge>
							<code class="font-mono text-sm">/api/v1/posts/[id]/publish-now</code>
							<Badge variant="outline">Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Publishes a queued row right now. Only queued rows can be published. Returns the new
							status and posted URL.
						</p>
					</div>
				</CardContent>
			</Card>

			<Card id="scheduled">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Timer class="size-4" /> Scheduled rows
					</CardTitle>
					<CardDescription>Edit, cancel, or retry what has not sent yet.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge variant="outline" class="font-mono">PATCH</Badge>
							<code class="font-mono text-sm">/api/v1/scheduled/[id]</code>
							<Badge variant="outline">Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Edits an unsent post. Queued and failed rows can change text. Only queued rows can
							move time. The text lives on the shared post, so every unsent copy updates together.
						</p>
					</div>
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge variant="destructive" class="font-mono">DELETE</Badge>
							<code class="font-mono text-sm">/api/v1/scheduled/[id]</code>
							<Badge variant="outline">Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Cancels a queued row. Posted, failed, and canceled rows cannot be canceled.
						</p>
					</div>
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge class="font-mono">POST</Badge>
							<code class="font-mono text-sm">/api/v1/scheduled/[id]/retry</code>
							<Badge variant="outline">Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Re-queues a failed row at a new future time. Attempts reset to zero and the last error
							clears. Body:
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs"
								>{'{ "runAt": "2026-09-20T09:00:00.000Z" }'}</code
							>.
						</p>
					</div>
				</CardContent>
			</Card>

			<Card id="tokens">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<KeyRound class="size-4" /> Tokens
					</CardTitle>
					<CardDescription>Create in the UI or here. Raw secret shows once.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge variant="secondary" class="font-mono">GET</Badge>
							<code class="font-mono text-sm">/api/v1/tokens</code>
							<Badge variant="outline">Session or Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Lists token metadata: id, name, created and last-used times. Never returns the raw
							secret.
						</p>
					</div>
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge class="font-mono">POST</Badge>
							<code class="font-mono text-sm">/api/v1/tokens</code>
							<Badge variant="outline">Session or Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Creates a token. Name holds 1 to 50 characters. The response includes the raw token
							once. Save it then. It never shows again.
						</p>
						<div class="mt-3 rounded-md border bg-muted/40 p-3">
							<div class="mb-2 flex items-center justify-between">
								<p class="text-xs font-medium">Example: create a token</p>
								<Button
									size="sm"
									variant="outline"
									class="gap-1.5"
									onclick={() => copyText('token', curlToken)}
								>
									{#if copied === 'token'}
										<Check class="size-3.5" /> Copied
									{:else}
										<Copy class="size-3.5" /> Copy
									{/if}
								</Button>
							</div>
							<pre class="overflow-x-auto font-mono text-xs">{curlToken}</pre>
						</div>
					</div>
					<div class="rounded-lg border p-4">
						<p class="flex flex-wrap items-center gap-2">
							<Badge variant="destructive" class="font-mono">DELETE</Badge>
							<code class="font-mono text-sm">/api/v1/tokens/[id]</code>
							<Badge variant="outline">Session or Bearer</Badge>
						</p>
						<p class="mt-2 text-sm text-muted-foreground">Revokes a token immediately.</p>
					</div>
				</CardContent>
			</Card>

			<Card id="limits">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<ListTree class="size-4" /> Limits that shape your calls
					</CardTitle>
					<CardDescription>Check platforms first. Fit text before you send.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="overflow-x-auto rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Channel</Table.Head>
									<Table.Head>Per-part limit</Table.Head>
									<Table.Head>Over-limit behavior</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each limitRows as row (row.channel)}
									<Table.Row>
										<Table.Cell class="font-medium">{row.channel}</Table.Cell>
										<Table.Cell class="font-mono text-xs">{row.limit}</Table.Cell>
										<Table.Cell class="text-sm text-muted-foreground">{row.behavior}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
					<ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
						<li>Character counts use graphemes, not code units. Emoji counts as one.</li>
						<li>LinkedIn cannot split. Over-limit text is rejected with TOO_LONG.</li>
						<li>
							Plan quotas apply: Creator 5 accounts and 5,000 posts a month. Pro unlimited accounts
							and unlimited posts.
						</li>
						<li>Hosted posting needs an active paid plan. Self-host skips billing.</li>
					</ul>
				</CardContent>
			</Card>

			<Card id="errors">
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<ShieldCheck class="size-4" /> Errors
					</CardTitle>
					<CardDescription>Every failure tells you its code and status.</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="overflow-x-auto rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Code</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>When</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each errorRows as row (row.code)}
									<Table.Row>
										<Table.Cell class="font-mono text-xs">{row.code}</Table.Cell>
										<Table.Cell class="font-mono text-xs">{row.status}</Table.Cell>
										<Table.Cell class="text-sm text-muted-foreground">{row.when}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Braces class="size-4" /> Prefer agents over curl?
					</CardTitle>
					<CardDescription>The MCP server forwards to this same API.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3 text-sm text-muted-foreground">
					<p>
						Four tools, one per domain:
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">aghara_health</code>,
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">aghara_accounts</code>,
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">aghara_posts</code>,
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">aghara_platforms</code>. No
						business logic lives in the tools. They call these endpoints with your bearer token.
					</p>
					<div class="flex flex-wrap gap-2">
						<Button href="/docs/mcp" variant="outline" class="gap-2">
							<Plug class="size-4" /> Read the MCP docs
						</Button>
						<Button href="/tokens" class="gap-2">
							<KeyRound class="size-4" /> Create API token
						</Button>
					</div>
					<p class="flex items-center gap-1.5 text-xs">
						<CircleCheck class="size-3.5 text-primary" /> Same schemas, same services, same limits.
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
