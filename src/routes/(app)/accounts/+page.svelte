<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { listAccountsQuery, disconnectAccountCommand } from '$lib/remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ConnectAccountDialog from '$lib/components/blocks/ConnectAccountDialog.svelte';
	import { Bird, Send, Hash, AtSign, Link2, Plus, Trash2 } from '@lucide/svelte/icons';
	import LinkedinIcon from '$lib/components/brand/LinkedinIcon.svelte';
	import ThreadsIcon from '$lib/components/brand/ThreadsIcon.svelte';

	const accounts = listAccountsQuery();

	let dialogOpen = $state(false);
	let dialogChannel = $state('bluesky');

	const channels = [
		{ id: 'bluesky', name: 'Bluesky', icon: Bird, note: 'handle + app password' },
		{ id: 'telegram', name: 'Telegram', icon: Send, note: 'bot token + chat ID' },
		{ id: 'discord', name: 'Discord', icon: Hash, note: 'webhook URL' },
		{ id: 'mastodon', name: 'Mastodon', icon: AtSign, note: 'instance + token' },
		{ id: 'linkedin', name: 'LinkedIn', icon: LinkedinIcon, note: 'access token' },
		{ id: 'threads', name: 'Threads', icon: ThreadsIcon, note: 'Meta token' }
	];

	async function disconnect(id: string, label: string) {
		if (!confirm(`Disconnect ${label}? Queued posts to it will be canceled.`)) return;
		try {
			await disconnectAccountCommand({ accountId: id });
			toast.success('Disconnected.');
			accounts.refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Disconnect failed');
		}
	}

	function openConnect(channel: string) {
		dialogChannel = channel;
		dialogOpen = true;
	}
</script>

<svelte:head><title>Accounts — Aghara</title></svelte:head>

{#snippet channelIcon(id: string)}
	{#if id === 'bluesky'}
		<Bird class="size-4" />
	{:else if id === 'telegram'}
		<Send class="size-4" />
	{:else if id === 'discord'}
		<Hash class="size-4" />
	{:else if id === 'mastodon'}
		<AtSign class="size-4" />
	{:else if id === 'linkedin'}
		<LinkedinIcon class="size-4" />
	{:else if id === 'threads'}
		<ThreadsIcon class="size-4" />
	{:else}
		<Link2 class="size-4" />
	{/if}
{/snippet}

<div class="space-y-8">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Accounts</h1>
		<p class="mt-1 text-muted-foreground">
			Connect the networks you use — unconnected ones stay hidden.
		</p>
	</div>

	<!-- Connected -->
	<section>
		<h2 class="mb-4 text-lg font-semibold tracking-tight">Connected</h2>
		{#if !accounts.current}
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each [0, 1, 2] as _}
					<div class="h-24 animate-pulse rounded-xl border bg-muted/40"></div>
				{/each}
			</div>
		{:else if accounts.current.length === 0}
			<div class="rounded-xl border border-dashed p-8 text-center">
				<Link2 class="mx-auto size-7 text-muted-foreground" />
				<p class="mt-3 text-sm font-medium">No networks connected yet</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Pick one below — Bluesky takes about 30 seconds.
				</p>
			</div>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each accounts.current as account (account.id)}
					<Card>
						<CardContent class="flex items-center justify-between gap-3 pt-6">
							<div class="flex min-w-0 items-center gap-3">
								<span
									class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
								>
									{@render channelIcon(account.channel)}
								</span>
								<div class="min-w-0">
									<p class="truncate font-medium">{account.label}</p>
									<p class="text-xs text-muted-foreground capitalize">{account.channel}</p>
								</div>
							</div>
							<button
								type="button"
								class="text-muted-foreground transition hover:text-destructive"
								aria-label={`Disconnect ${account.label}`}
								onclick={() => disconnect(account.id, account.label)}
							>
								<Trash2 class="size-4" />
							</button>
						</CardContent>
					</Card>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Add a network -->
	<section>
		<h2 class="mb-4 text-lg font-semibold tracking-tight">Add a network</h2>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each channels as channel (channel.id)}
				<Card class="transition hover:border-primary/50">
					<CardContent class="flex items-center justify-between gap-3 pt-6">
						<div class="flex min-w-0 items-center gap-3">
							<span
								class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
							>
								<channel.icon class="size-4" />
							</span>
							<div class="min-w-0">
								<p class="font-medium">{channel.name}</p>
								<p class="truncate text-xs text-muted-foreground">{channel.note}</p>
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							class="gap-1.5"
							onclick={() => openConnect(channel.id)}
						>
							<Plus class="size-3.5" /> Connect
						</Button>
					</CardContent>
				</Card>
			{/each}
		</div>
	</section>
</div>

<ConnectAccountDialog
	open={dialogOpen}
	channel={dialogChannel}
	onClose={() => (dialogOpen = false)}
/>
