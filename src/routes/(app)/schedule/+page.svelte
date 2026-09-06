<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		listScheduledQuery,
		publishNowCommand,
		cancelScheduledCommand,
		retryScheduledCommand
	} from '$lib/remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { cn } from '$lib/utils';
	import {
		CalendarClock,
		Send,
		X,
		ExternalLink,
		CircleCheck,
		CircleX,
		Clock,
		Ban,
		ChevronDown,
		Info,
		RotateCcw,
		ListTree
	} from '@lucide/svelte/icons';
	import type { Component } from 'svelte';

	const scheduled = listScheduledQuery();

	let busy = $state<string | null>(null);
	let filter = $state<'all' | 'queued' | 'posted' | 'failed' | 'canceled'>('all');
	// Multiple rows can be expanded at once — each toggle adds/removes its id.
	let expanded = $state<string[]>([]);

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	const statusMeta: Record<
		string,
		{ label: string; icon: Component; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
	> = {
		queued: { label: 'Queued', icon: Clock, variant: 'outline' },
		posted: { label: 'Posted', icon: CircleCheck, variant: 'default' },
		failed: { label: 'Failed', icon: CircleX, variant: 'destructive' },
		canceled: { label: 'Canceled', icon: Ban, variant: 'secondary' }
	};

	const filters: { id: 'all' | 'queued' | 'posted' | 'failed' | 'canceled'; label: string }[] = [
		{ id: 'all', label: 'All' },
		{ id: 'queued', label: 'Queued' },
		{ id: 'posted', label: 'Posted' },
		{ id: 'failed', label: 'Failed' },
		{ id: 'canceled', label: 'Canceled' }
	];

	const counts = $derived.by(() => {
		const all = scheduled.current ?? [];
		return {
			all: all.length,
			queued: all.filter((p) => p.status === 'queued').length,
			posted: all.filter((p) => p.status === 'posted').length,
			failed: all.filter((p) => p.status === 'failed').length,
			canceled: all.filter((p) => p.status === 'canceled').length
		};
	});

	const filtered = $derived(
		filter === 'all'
			? (scheduled.current ?? [])
			: (scheduled.current ?? []).filter((p) => p.status === filter)
	);

	function toggleDetails(id: string) {
		expanded = expanded.includes(id) ? expanded.filter((x) => x !== id) : [...expanded, id];
	}

	function isExpanded(id: string) {
		return expanded.includes(id);
	}

	// Retry a failed post at a chosen time.
	let retryTarget = $state<string | null>(null);
	let retryRunAtLocal = $state('');

	function defaultRetryTime(): string {
		const d = new Date(Date.now() + 5 * 60 * 1000);
		d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	function openRetry(id: string) {
		retryTarget = id;
		retryRunAtLocal = defaultRetryTime();
	}

	async function confirmRetry() {
		if (!retryTarget || !retryRunAtLocal) return;
		const when = new Date(retryRunAtLocal);
		if (Number.isNaN(when.getTime())) {
			toast.error('Pick a valid time.');
			return;
		}
		busy = retryTarget;
		try {
			await retryScheduledCommand({ scheduledId: retryTarget, runAt: when.toISOString() });
			toast.success('Re-queued — Aghara will retry on time.');
			retryTarget = null;
			scheduled.refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Retry failed');
		} finally {
			busy = null;
		}
	}

	async function publishNow(id: string) {
		busy = id;
		try {
			const result = await publishNowCommand({ scheduledId: id });
			toast.success(result.postedUrl ? 'Published — link saved.' : 'Published.');
			scheduled.refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Publish failed');
		} finally {
			busy = null;
		}
	}

	async function cancel(id: string) {
		busy = id;
		try {
			await cancelScheduledCommand({ scheduledId: id });
			toast.success('Canceled.');
			scheduled.refresh();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Cancel failed');
		} finally {
			busy = null;
		}
	}
</script>

<svelte:head><title>Schedule — Aghara</title></svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Schedule</h1>
			<p class="mt-1 text-muted-foreground">Every announcement, past and future.</p>
		</div>
		<a href="/compose"><Button class="gap-2"><Send class="size-4" /> Compose</Button></a>
	</div>

	{#if !scheduled.current}
		<div class="rounded-xl border border-dashed p-10 text-center">
			<CalendarClock class="mx-auto size-8 text-muted-foreground" />
			<h3 class="mt-4 font-semibold">No posts yet</h3>
			<p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
				Schedule your first post — it takes about 30 seconds.
			</p>
			<a href="/compose" class="mt-6 inline-block">
				<Button class="gap-2"><Send class="size-4" /> Schedule your first post</Button>
			</a>
		</div>
	{:else if scheduled.current.length === 0}
		<div class="rounded-xl border border-dashed p-10 text-center">
			<CalendarClock class="mx-auto size-8 text-muted-foreground" />
			<h3 class="mt-4 font-semibold">Nothing here</h3>
			<p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
				When you schedule posts, they'll show up here.
			</p>
			<a href="/compose" class="mt-6 inline-block">
				<Button class="gap-2"><Send class="size-4" /> Schedule your first post</Button>
			</a>
		</div>
	{:else}
		<Card>
			<div class="flex flex-wrap items-center gap-2 border-b px-4 py-3">
				{#each filters as f (f.id)}
					<button
						type="button"
						class={cn(
							'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
							filter === f.id
								? 'border-primary bg-primary text-primary-foreground'
								: 'border-border text-muted-foreground hover:bg-muted'
						)}
						onclick={() => (filter = f.id)}
					>
						{f.label}
						<span class="tabular-nums opacity-70">{counts[f.id]}</span>
					</button>
				{/each}
			</div>
			{#if filtered.length === 0}
				<CardContent class="p-10 text-center text-sm text-muted-foreground">
					No {filter === 'all' ? 'posts' : `${filter} posts`} here.
				</CardContent>
			{:else}
				<CardContent class="pt-6">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Post</TableHead>
								<TableHead>Network</TableHead>
								<TableHead>When</TableHead>
								<TableHead>Status</TableHead>
								<TableHead class="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each filtered as post (post.scheduledId)}
								{@const meta = statusMeta[post.status] ?? {
									label: post.status,
									icon: Info,
									variant: 'outline'
								}}
								<TableRow class={post.status === 'failed' ? 'bg-destructive/5' : undefined}>
									<TableCell class="max-w-64">
										<div class="flex items-start gap-2">
											<button
												type="button"
												class="mt-0.5 shrink-0 text-muted-foreground transition hover:text-foreground"
												aria-label={isExpanded(post.scheduledId) ? 'Hide details' : 'Show details'}
												aria-expanded={isExpanded(post.scheduledId)}
												onclick={() => toggleDetails(post.scheduledId)}
											>
												<ChevronDown
													class={cn(
														'size-4 transition-transform',
														isExpanded(post.scheduledId) && 'rotate-180'
													)}
												/>
											</button>
											<div class="min-w-0">
												<p class="truncate font-medium">{post.body}</p>
												{#if post.segments && post.segments.length > 1}
													<p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
														<ListTree class="size-3" /> Thread · {post.segments.length} parts
													</p>
												{/if}
												{#if post.status === 'failed' && post.lastError}
													<p class="mt-1 flex items-center gap-1 text-xs text-destructive">
														<CircleX class="size-3" />
														<span class="truncate">{post.lastError}</span>
													</p>
												{/if}
											</div>
										</div>
									</TableCell>
									<TableCell class="whitespace-nowrap text-muted-foreground">{post.label}</TableCell
									>
									<TableCell class="whitespace-nowrap text-muted-foreground">
										{formatDate(post.runAt)}
									</TableCell>
									<TableCell>
										<Badge variant={meta.variant} class="gap-1">
											<meta.icon class="size-3" />
											{meta.label}
										</Badge>
									</TableCell>
									<TableCell class="text-right">
										<div class="flex justify-end gap-2">
											{#if post.status === 'queued'}
												<Button
													size="sm"
													variant="outline"
													class="gap-1.5"
													disabled={busy === post.scheduledId}
													onclick={() => publishNow(post.scheduledId)}
												>
													<Send class="size-3.5" /> Publish now
												</Button>
												<Button
													size="sm"
													variant="ghost"
													class="gap-1.5 text-muted-foreground"
													disabled={busy === post.scheduledId}
													onclick={() => cancel(post.scheduledId)}
												>
													<X class="size-3.5" /> Cancel
												</Button>
											{:else if post.status === 'failed'}
												<Button
													size="sm"
													variant="outline"
													class="gap-1.5"
													disabled={busy === post.scheduledId}
													onclick={() => openRetry(post.scheduledId)}
												>
													<RotateCcw class="size-3.5" /> Retry
												</Button>
											{:else if post.status === 'posted' && post.postedUrl}
												<a
													href={post.postedUrl}
													target="_blank"
													rel="noreferrer"
													class="inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary hover:underline"
												>
													<ExternalLink class="size-3.5" /> View
												</a>
											{/if}
										</div>
									</TableCell>
								</TableRow>
								{#if isExpanded(post.scheduledId)}
									<TableRow>
										<TableCell colspan={5} class="bg-muted/30 p-0">
											<div class="grid gap-4 px-4 py-4 sm:grid-cols-2">
												<div class="space-y-1">
													<p
														class="text-xs font-medium tracking-wide text-muted-foreground uppercase"
													>
														Post
													</p>
													<p class="text-sm whitespace-pre-wrap">{post.body}</p>
													{#if post.segments && post.segments.length > 1}
														<div class="space-y-2 pt-2">
															<p
																class="text-xs font-medium tracking-wide text-muted-foreground uppercase"
															>
																Thread · {post.segments.length} parts
															</p>
															{#each post.segments as seg, i (i)}
																<div class="rounded-md border bg-background p-2">
																	<p class="text-xs font-medium text-muted-foreground">
																		Part {i + 1}
																	</p>
																	<p class="mt-1 text-sm whitespace-pre-wrap">{seg}</p>
																</div>
															{/each}
														</div>
													{/if}
												</div>
												<div class="space-y-3">
													<div class="flex items-center justify-between gap-4 text-sm">
														<span class="text-muted-foreground">Network</span>
														<span class="font-medium capitalize">{post.channel} · {post.label}</span
														>
													</div>
													<div class="flex items-center justify-between gap-4 text-sm">
														<span class="text-muted-foreground">Scheduled</span>
														<span>{formatDate(post.runAt)}</span>
													</div>
													{#if post.status === 'posted'}
														<div class="flex items-center justify-between gap-4 text-sm">
															<span class="text-muted-foreground">Posted</span>
															<span>{post.postedAt ? formatDate(post.postedAt) : '—'}</span>
														</div>
													{/if}
													{#if post.status === 'queued' || post.status === 'failed'}
														<div class="flex items-center justify-between gap-4 text-sm">
															<span class="text-muted-foreground">Attempts</span>
															<span class="tabular-nums">{post.attempts}/3</span>
														</div>
													{/if}
													{#if post.status === 'failed' && post.lastError}
														<div
															class="rounded-md border border-destructive/30 bg-destructive/5 p-3"
														>
															<p
																class="flex items-center gap-1.5 text-xs font-medium text-destructive"
															>
																<CircleX class="size-3.5" /> Last error
															</p>
															<p class="mt-1 text-sm wrap-break-word">{post.lastError}</p>
														</div>
													{/if}
													{#if post.status === 'posted' && post.postedUrl}
														<a
															href={post.postedUrl}
															target="_blank"
															rel="noreferrer"
															class="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
														>
															<ExternalLink class="size-3.5" /> View on {post.channel}
														</a>
													{/if}
													{#if post.postedUrls && post.postedUrls.length > 1}
														<div class="flex flex-wrap items-center gap-1.5">
															<span class="text-xs text-muted-foreground">Thread:</span>
															{#each post.postedUrls as u, i (i)}
																<a
																	href={u}
																	target="_blank"
																	rel="noreferrer"
																	class="text-xs text-primary hover:underline"
																>
																	Part {i + 1}
																</a>
															{/each}
														</div>
													{/if}
												</div>
											</div>
										</TableCell>
									</TableRow>
								{/if}
							{/each}
						</TableBody>
					</Table>
				</CardContent>
			{/if}
		</Card>
	{/if}

	<Dialog
		open={retryTarget !== null}
		onOpenChange={(o) => {
			if (!o) retryTarget = null;
		}}
	>
		<DialogContent class="sm:max-w-md">
			<DialogHeader>
				<DialogTitle class="flex items-center gap-2">
					<RotateCcw class="size-5" /> Retry post
				</DialogTitle>
				<DialogDescription>
					Re-queue this failed post. Pick a time and Aghara will publish it then.
				</DialogDescription>
			</DialogHeader>
			<div class="space-y-2">
				<Label for="retry-time">Retry at</Label>
				<Input id="retry-time" type="datetime-local" bind:value={retryRunAtLocal} />
				<p class="text-xs text-muted-foreground">Defaults to five minutes from now.</p>
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={() => (retryTarget = null)}>Cancel</Button>
				<Button
					type="button"
					class="gap-1.5"
					disabled={busy === retryTarget || !retryRunAtLocal}
					onclick={confirmRetry}
				>
					<RotateCcw class="size-3.5" /> Retry at this time
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
</div>
