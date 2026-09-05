<script lang="ts">
	import { listAccountsQuery, listScheduledQuery, myPlanQuery } from '$lib/remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Link2,
		Send,
		CalendarClock,
		CheckCircle2,
		AlertTriangle,
		ArrowRight,
		Megaphone
	} from '@lucide/svelte/icons';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const accounts = listAccountsQuery();
	const scheduled = listScheduledQuery();
	const plan = myPlanQuery();

	const queued = $derived(scheduled.current?.filter((p) => p.status === 'queued').length ?? 0);
	const posted = $derived(scheduled.current?.filter((p) => p.status === 'posted').length ?? 0);
	const failed = $derived(scheduled.current?.filter((p) => p.status === 'failed').length ?? 0);

	const firstName = $derived(data.user.name.split(' ')[0]);

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<svelte:head><title>Dashboard — Aghara</title></svelte:head>

<div class="space-y-8">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Good day, {firstName}</h1>
			<p class="mt-1 text-muted-foreground">
				{queued} post{queued === 1 ? '' : 's'} queued · {posted} published
			</p>
		</div>
		<div class="flex gap-3">
			<a href="/accounts"
				><Button variant="outline" class="gap-2"><Link2 class="size-4" /> Connect</Button></a
			>
			<a href="/compose"><Button class="gap-2"><Send class="size-4" /> Compose</Button></a>
		</div>
	</div>

	<!-- Stats -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="pb-2">
				<CardTitle class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<Link2 class="size-4" /> Connected
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-semibold tracking-tight">{accounts.current?.length ?? '—'}</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="pb-2">
				<CardTitle class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<CalendarClock class="size-4" /> Queued
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-semibold tracking-tight">{queued}</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="pb-2">
				<CardTitle class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<CheckCircle2 class="size-4" /> Published
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-semibold tracking-tight">{posted}</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="pb-2">
				<CardTitle class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<AlertTriangle class="size-4" /> Failed
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-semibold tracking-tight">{failed}</p>
			</CardContent>
		</Card>
	</div>

	<!-- Plan usage — goal gradient: show progress toward the limit -->
	{#if plan.current && plan.current.plan !== 'self-host' && plan.current.limits}
		<Card>
			<CardContent class="flex flex-wrap items-center justify-between gap-4 pt-6">
				<div class="min-w-0">
					<p class="text-sm font-medium">
						{plan.current.plan === 'creator' ? 'Creator' : 'Pro'} plan
					</p>
					<p class="text-sm text-muted-foreground">
						{queued + posted + failed} of {plan.current.limits.scheduledPerMonth} scheduled posts used
						this month
					</p>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Recent activity -->
	<section>
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold tracking-tight">Recent posts</h2>
			<a href="/schedule" class="text-sm font-medium text-primary hover:underline">View all</a>
		</div>

		{#if !accounts.current}
			<div class="rounded-xl border border-dashed p-10 text-center">
				<Megaphone class="mx-auto size-8 text-muted-foreground" />
				<h3 class="mt-4 font-semibold">Start your first announcement</h3>
				<p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
					Connect a network like Bluesky — it takes 30 seconds with an app password.
				</p>
				<a href="/accounts" class="mt-6 inline-block">
					<Button class="gap-2">Connect your first network <ArrowRight class="size-4" /></Button>
				</a>
			</div>
		{:else if scheduled.current && scheduled.current.length === 0}
			<div class="rounded-xl border border-dashed p-10 text-center">
				<Send class="mx-auto size-8 text-muted-foreground" />
				<h3 class="mt-4 font-semibold">Nothing scheduled yet</h3>
				<p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
					Write once, pick a time, and Aghara announces for you.
				</p>
				<a href="/compose" class="mt-6 inline-block">
					<Button class="gap-2">Schedule your first post <ArrowRight class="size-4" /></Button>
				</a>
			</div>
		{:else}
			<div class="space-y-3">
				{#each (scheduled.current ?? []).slice(0, 5) as post (post.scheduledId)}
					<Card>
						<CardContent class="flex flex-wrap items-center justify-between gap-3 pt-6">
							<div class="min-w-0">
								<p class="truncate text-sm font-medium">{post.body}</p>
								<p class="mt-1 text-xs text-muted-foreground">
									{post.label} · {formatDate(post.runAt)}
								</p>
							</div>
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
						</CardContent>
					</Card>
				{/each}
			</div>
		{/if}
	</section>
</div>
