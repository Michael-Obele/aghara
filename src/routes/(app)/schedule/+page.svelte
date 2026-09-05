<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { listScheduledQuery, publishNowCommand, cancelScheduledCommand } from '$lib/remote';
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
	import { CalendarClock, Send, X, ExternalLink, AlertTriangle } from '@lucide/svelte/icons';

	const scheduled = listScheduledQuery();

	let busy = $state<string | null>(null);

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
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
						{#each scheduled.current as post (post.scheduledId)}
							<TableRow>
								<TableCell class="max-w-64">
									<p class="truncate font-medium">{post.body}</p>
									{#if post.status === 'failed' && post.lastError}
										<p class="mt-1 flex items-center gap-1 text-xs text-destructive">
											<AlertTriangle class="size-3" />
											<span class="truncate">{post.lastError}</span>
										</p>
									{/if}
								</TableCell>
								<TableCell class="whitespace-nowrap text-muted-foreground">{post.label}</TableCell>
								<TableCell class="whitespace-nowrap text-muted-foreground">
									{formatDate(post.runAt)}
								</TableCell>
								<TableCell>
									<Badge
										variant={post.status === 'posted'
											? 'default'
											: post.status === 'failed'
												? 'destructive'
												: post.status === 'canceled'
													? 'secondary'
													: 'outline'}
									>
										{post.status}
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
						{/each}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	{/if}
</div>
