<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { listTokensQuery, createTokenCommand, revokeTokenCommand } from '$lib/remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import { KeyRound, Plus, Copy, Trash2, AlertTriangle } from '@lucide/svelte/icons';

	const tokens = listTokensQuery();

	let name = $state('');
	let creating = $state(false);
	let newToken = $state<{ name: string; raw: string } | null>(null);
	let busy = $state<string | null>(null);

	async function create() {
		if (!name.trim()) return;
		creating = true;
		try {
			const result = await createTokenCommand({ name: name.trim() });
			newToken = { name: result.name, raw: result.raw };
			name = '';
			tokens.refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Could not create token');
		} finally {
			creating = false;
		}
	}

	async function copyRaw() {
		if (!newToken) return;
		await navigator.clipboard.writeText(newToken.raw);
		toast.success('Token copied — store it somewhere safe.');
	}

	async function revoke(id: string, tokenName: string) {
		if (!confirm(`Revoke "${tokenName}"? Anything using it will stop working.`)) return;
		busy = id;
		try {
			await revokeTokenCommand({ tokenId: id });
			toast.success('Token revoked.');
			tokens.refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Revoke failed');
		} finally {
			busy = null;
		}
	}

	function formatDate(d: Date | string | null) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head><title>API tokens — Aghara</title></svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">API tokens</h1>
		<p class="mt-1 text-muted-foreground">
			Bearer tokens for machines and agents — each shown exactly once. Use them with the
			<a href="/docs/mcp" class="underline">MCP server</a> or the REST API directly.
		</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2"
				><KeyRound class="size-4" /> Create a token</CardTitle
			>
			<CardDescription>Name it after what uses it, e.g. “my agent”.</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="flex gap-2">
				<Input
					bind:value={name}
					placeholder="e.g. my agent"
					maxlength={50}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							create();
						}
					}}
				/>
				<Button onclick={create} disabled={creating || !name.trim()} class="shrink-0 gap-2">
					<Plus class="size-4" /> Create
				</Button>
			</div>
		</CardContent>
	</Card>

	{#if !tokens.current}
		<div class="grid gap-3">
			{#each [0, 1] as _}
				<div class="h-16 animate-pulse rounded-xl border bg-muted/40"></div>
			{/each}
		</div>
	{:else if tokens.current.length === 0}
		<div class="rounded-xl border border-dashed p-8 text-center">
			<KeyRound class="mx-auto size-7 text-muted-foreground" />
			<p class="mt-3 text-sm font-medium">No tokens yet</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Create one above to let machines and agents control your schedule.
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each tokens.current as token (token.id)}
				<Card>
					<CardContent class="flex flex-wrap items-center justify-between gap-3 pt-6">
						<div class="min-w-0">
							<p class="font-medium">{token.name}</p>
							<p class="text-xs text-muted-foreground">
								Created {formatDate(token.createdAt ?? null)} · Last used {formatDate(
									token.lastUsedAt ?? null
								)}
							</p>
						</div>
						<div class="flex items-center gap-3">
							{#if token.revokedAt}
								<Badge variant="secondary" class="gap-1"
									><AlertTriangle class="size-3" /> Revoked</Badge
								>
							{:else}
								<Badge>Active</Badge>
								<Button
									size="sm"
									variant="ghost"
									class="gap-1.5 text-muted-foreground"
									disabled={busy === token.id}
									onclick={() => revoke(token.id, token.name)}
								>
									<Trash2 class="size-3.5" /> Revoke
								</Button>
							{/if}
						</div>
					</CardContent>
				</Card>
			{/each}
		</div>
	{/if}
</div>

<!-- Show-once dialog -->
<Dialog open={!!newToken} onOpenChange={(o) => !o && (newToken = null)}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Token created — copy it now</DialogTitle>
			<DialogDescription>
				This is the only time the full token is shown. Store it somewhere safe.
			</DialogDescription>
		</DialogHeader>
		{#if newToken}
			<div class="space-y-3">
				<div class="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
					<code class="min-w-0 flex-1 font-mono text-xs break-all">{newToken.raw}</code>
					<Button size="sm" variant="outline" class="shrink-0 gap-1.5" onclick={copyRaw}>
						<Copy class="size-3.5" /> Copy
					</Button>
				</div>
				<p class="text-xs text-muted-foreground">
					Use it as <code class="rounded bg-muted px-1 py-0.5"
						>Authorization: Bearer {newToken.raw.slice(0, 8)}…</code
					>
				</p>
			</div>
		{/if}
	</DialogContent>
</Dialog>
