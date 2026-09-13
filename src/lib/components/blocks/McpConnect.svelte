<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Copy, Check, Terminal, Puzzle } from '@lucide/svelte/icons';

	interface Props {
		endpoint: string;
		class?: string;
	}

	let { endpoint, class: className }: Props = $props();

	type Client = 'vscode' | 'claude' | 'codex' | 'zed' | 'npm';

	let client = $state<Client>('npm');
	let copied = $state(false);

	const snippets = $derived({
		vscode: {
			label: 'VS Code',
			code: JSON.stringify(
				{
					servers: {
						aghara: {
							type: 'http',
							url: endpoint,
							headers: { Authorization: 'Bearer ${input:aghara-token}' }
						}
					},
					inputs: [
						{
							type: 'promptString',
							id: 'aghara-token',
							description: 'Aghara API token (/tokens page)',
							password: true
						}
					]
				},
				null,
				2
			)
		},
		claude: {
			label: 'Claude Desktop',
			code: JSON.stringify(
				{
					mcpServers: {
						aghara: {
							command: 'npx',
							args: [
								'mcp-remote',
								endpoint,
								'--header',
								'Authorization: Bearer <paste-token-from-/tokens>'
							]
						}
					}
				},
				null,
				2
			)
		},
		codex: {
			label: 'Codex CLI',
			code: `codex mcp add --transport http aghara ${endpoint} --header "Authorization: Bearer <paste-token-from-/tokens>"`
		},
		zed: {
			label: 'Zed',
			code: JSON.stringify(
				{
					context_servers: {
						aghara: {
							url: endpoint,
							headers: { Authorization: 'Bearer <paste-token-from-/tokens>' }
						}
					}
				},
				null,
				2
			)
		},
		npm: {
			label: 'npm (local)',
			code: JSON.stringify(
				{
					mcpServers: {
						aghara: {
							command: 'bunx',
							args: ['aghara-mcp'],
							env: {
								AGHARA_BASE_URL: 'https://aghara.svelte-apps.me',
								AGHARA_API_TOKEN: '<paste-token-from-/tokens>'
							}
						}
					}
				},
				null,
				2
			)
		}
	} as const satisfies Record<Client, { label: string; code: string }>);

	const tabs: { id: Client; label: string }[] = [
		{ id: 'npm', label: 'npm' },
		{ id: 'vscode', label: 'VS Code' },
		{ id: 'claude', label: 'Claude' },
		{ id: 'codex', label: 'Codex' },
		{ id: 'zed', label: 'Zed' }
	];

	async function copy() {
		await navigator.clipboard.writeText(snippets[client].code);
		copied = true;
		toast.success(`${snippets[client].label} snippet copied.`);
		setTimeout(() => (copied = false), 1500);
	}
</script>

<div class={cn('rounded-md border bg-muted/40 p-3', className)}>
	<div class="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
		<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
			{#if client === 'vscode'}
				<Puzzle class="size-3.5 shrink-0" />
			{:else}
				<Terminal class="size-3.5 shrink-0" />
			{/if}
			Connect — {snippets[client].label}
		</p>
		<div class="flex flex-wrap items-center gap-1.5">
			<div
				class="flex max-w-full flex-wrap overflow-hidden rounded-md border bg-background"
				role="tablist"
			>
				{#each tabs as t (t.id)}
					<button
						type="button"
						role="tab"
						aria-selected={client === t.id}
						class={cn(
							'min-h-7 flex-1 px-2 py-1 text-xs font-medium whitespace-nowrap transition sm:flex-none',
							client === t.id ? 'bg-secondary text-foreground' : 'text-muted-foreground'
						)}
						onclick={() => (client = t.id)}
					>
						{t.label}
					</button>
				{/each}
			</div>
			<Button size="sm" variant="outline" class="gap-1.5" onclick={copy}>
				{#if copied}<Check class="size-3.5" /> Copied{:else}<Copy class="size-3.5" /> Copy{/if}
			</Button>
		</div>
	</div>
	{#if client === 'vscode'}
		<p class="mb-1.5 text-xs text-muted-foreground">
			Add to <code class="rounded bg-muted px-1 py-0.5 font-mono">.vscode/mcp.json</code>
			(workspace) or your user MCP config. The
			<code class="rounded bg-muted px-1 py-0.5 font-mono">headers.Authorization</code> Bearer is
			forwarded per request — no server-side token needed. VS Code prompts for it via
			<code class="rounded bg-muted px-1 py-0.5 font-mono">${'{input:aghara-token}'}</code>.
		</p>
	{:else if client === 'claude'}
		<p class="mb-1.5 text-xs text-muted-foreground">
			Claude Desktop speaks stdio, so
			<code class="rounded bg-muted px-1 py-0.5 font-mono">mcp-remote</code> bridges to HTTP. The
			<code class="rounded bg-muted px-1 py-0.5 font-mono">--header</code> Bearer is forwarded per
			request — paste your token from <a href="/tokens" class="underline">API tokens</a>.
		</p>
	{:else if client === 'codex'}
		<p class="mb-1.5 text-xs text-muted-foreground">
			Run once in your terminal with your token from
			<a href="/tokens" class="underline">API tokens</a> — the
			<code class="rounded bg-muted px-1 py-0.5 font-mono">--header</code> Bearer is sent per request.
		</p>
	{:else if client === 'zed'}
		<p class="mb-1.5 text-xs text-muted-foreground">
			Settings → AI → MCP Servers → Add Server → Add Remote Server, or paste into your settings file
			under
			<code class="rounded bg-muted px-1 py-0.5 font-mono">context_servers</code>. The
			<code class="rounded bg-muted px-1 py-0.5 font-mono">headers.Authorization</code> Bearer is forwarded
			per request.
		</p>
	{:else if client === 'npm'}
		<p class="mb-1.5 text-xs text-muted-foreground">
			No hosting needed — runs STDIO locally via
			<code class="rounded bg-muted px-1 py-0.5 font-mono">bunx aghara-mcp</code>. Create the token
			at <a href="/tokens" class="underline">API tokens</a> and paste it into
			<code class="rounded bg-muted px-1 py-0.5 font-mono">AGHARA_API_TOKEN</code> below.
		</p>
	{:else}
		<p class="mb-1.5 text-xs text-muted-foreground">Run once in your terminal.</p>
	{/if}
	<pre class="overflow-x-auto font-mono text-xs">{snippets[client].code}</pre>
	<p class="mt-2 text-xs text-muted-foreground">
		Auth is your Aghara API token as a Bearer token — create one at
		<a href="/tokens" class="underline">API tokens</a> and give it to the MCP server as
		<code class="rounded bg-muted px-1 py-0.5 font-mono">AGHARA_API_TOKEN</code>. The MCP endpoint
		itself needs no login; the forwarded Bearer does the auth.
	</p>
</div>
