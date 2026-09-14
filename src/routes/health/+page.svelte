<script lang="ts">
	import { browser } from '$app/environment';
	import { getHealthLive, type HealthReport } from '$lib/remote';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import prettyMilliseconds from 'pretty-ms';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardAction,
		CardContent,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { formatRelativeTime } from '$lib/time';
	import {
		Activity,
		ChartBar,
		CircleCheck,
		CircleX,
		Clock,
		Copy,
		Gauge,
		Info,
		Radio,
		RefreshCw,
		Timer,
		TriangleAlert
	} from '@lucide/svelte/icons';

	const health = getHealthLive();

	// `await` (rather than `health.current`) — a live query's first value is
	// resolved during SSR and reused for hydration; `.current` is client-only.
	const report = $derived(await health);
	const probe = $derived(report.probe);
	const snapshot = $derived(report.snapshot);
	const issues = $derived(snapshot.checks.filter((check) => check.state !== 'ok'));

	let now = $state(new Date());

	type Sample = { ok: boolean; latencyMs: number; checkedAt: string };

	function toSample(r: HealthReport): Sample {
		return { ok: r.probe.ok, latencyMs: r.probe.latencyMs, checkedAt: r.checkedAt };
	}

	// Round-trip strip — appended on every streamed report. This is the one piece
	// of per-viewer history (it survives reconnects), so it can't be derived;
	// the untrack keeps the write from re-triggering this effect.
	let history = $state<Sample[]>([]);
	$effect(() => {
		const r = report;
		untrack(() => {
			history = [...history, toSample(r)].slice(-24);
		});
	});

	// Timers only — freshness ticker, so "checked 42s ago" stays honest.
	$effect(() => {
		const id = setInterval(() => {
			now = new Date();
		}, 15000);
		return () => clearInterval(id);
	});

	const hero = $derived.by(() => {
		if (!probe.body) {
			return {
				tone: 'down' as const,
				title: 'API unreachable',
				detail: probe.error ?? 'The public endpoint did not respond.'
			};
		}
		if (snapshot.status === 'ok') {
			return {
				tone: 'ok' as const,
				title: 'All systems operational',
				detail: 'The API responds, the database is reachable, and scheduled posts go out on time.'
			};
		}
		const summary =
			issues.map((issue) => issue.detail).join(' ') || 'One or more checks need attention.';
		return snapshot.status === 'down'
			? { tone: 'down' as const, title: 'System down', detail: summary }
			: { tone: 'degraded' as const, title: 'Degraded performance', detail: summary };
	});

	const toneClass = $derived.by(() => {
		if (hero.tone === 'ok')
			return { card: 'border-primary/40', icon: 'bg-primary/10 text-primary' };
		if (hero.tone === 'degraded')
			return { card: 'border-warning/40', icon: 'bg-warning/10 text-warning' };
		return { card: 'border-destructive/40', icon: 'bg-destructive/10 text-destructive' };
	});

	type ScreenRow = {
		id: string;
		label: string;
		state: 'ok' | 'fail';
		meta: string;
		detail: string;
	};

	const rows = $derived.by<ScreenRow[]>(() => {
		const api: ScreenRow = {
			id: 'api',
			label: 'REST API',
			state: probe.ok ? 'ok' : 'fail',
			meta: probe.statusCode ? `HTTP ${probe.statusCode} · ${probe.latencyMs} ms` : 'no response',
			detail: probe.error ?? `GET ${probe.url}`
		};
		const checks: ScreenRow[] = snapshot.checks.map((check) => ({
			id: check.id,
			label: check.label,
			state: check.state,
			meta: check.latencyMs === null ? 'every 60 s' : `${check.latencyMs} ms`,
			detail: check.detail
		}));
		return [api, ...checks];
	});

	const maxLatency = $derived(Math.max(1, ...history.filter((s) => s.ok).map((s) => s.latencyMs)));
	const okSamples = $derived(history.filter((s) => s.ok));
	const avgLatency = $derived(
		okSamples.length
			? Math.round(okSamples.reduce((a, b) => a + b.latencyMs, 0) / okSamples.length)
			: 0
	);
	const minLatency = $derived(
		okSamples.length ? Math.min(...okSamples.map((s) => s.latencyMs)) : 0
	);
	const failCount = $derived(history.filter((s) => !s.ok).length);

	function barHeight(sample: Sample): number {
		if (!sample.ok) return 44;
		return Math.max(7, Math.round((sample.latencyMs / maxLatency) * 44));
	}

	function barLabel(sample: Sample, index: number): string {
		const pos = `${index + 1} of ${history.length}`;
		if (!sample.ok) return `Probe ${pos} — failed (no response)`;
		return `Probe ${pos} — ${sample.latencyMs} ms`;
	}

	const responseJson = $derived(
		JSON.stringify(probe.body ?? { error: probe.error ?? 'No response from the endpoint' }, null, 2)
	);

	async function copyResponse() {
		try {
			await navigator.clipboard.writeText(responseJson);
			toast.success('Response copied');
		} catch {
			toast.error('Could not access the clipboard');
		}
	}
</script>

<svelte:head><title>System health — Aghara</title></svelte:head>

<!-- Public route (outside the gated (app) group) — the root layout supplies the
     navbar/footer, so this page brings its own container. No `pending` boundary:
     a pending snippet would replace the SSR-rendered content with a placeholder. -->
<div class="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">System health</h1>
			<p class="mt-1 text-muted-foreground">
				A server-side probe of the public API, the database, and the scheduler.
			</p>
		</div>
		<Button variant="outline" class="gap-2" onclick={() => void health.reconnect()}>
			<RefreshCw class="size-4" aria-hidden="true" /> Check now
		</Button>
	</div>

	<svelte:boundary>
		{#snippet failed(error, reset)}
			<Card>
				<CardContent class="flex flex-col items-start gap-3 p-6">
					<p class="font-medium">Could not run the checks</p>
					<p class="text-sm text-muted-foreground">
						{error instanceof Error ? error.message : String(error)}
					</p>
					<Button
						variant="outline"
						class="gap-2"
						onclick={() => {
							void health.reconnect();
							reset();
						}}
					>
						<RefreshCw class="size-4" aria-hidden="true" /> Try again
					</Button>
				</CardContent>
			</Card>
		{/snippet}

		<div class="space-y-6">
			<!-- Status hero -->
			<Card class={cn('border-2', toneClass.card)}>
				<CardContent class="flex flex-col gap-5 p-6">
					<div class="flex items-center gap-4">
						<span
							class={cn(
								'flex size-11 shrink-0 items-center justify-center rounded-full',
								toneClass.icon
							)}
							aria-hidden="true"
						>
							{#if hero.tone === 'ok'}
								<CircleCheck class="size-6" />
							{:else if hero.tone === 'degraded'}
								<TriangleAlert class="size-6" />
							{:else}
								<CircleX class="size-6" />
							{/if}
						</span>
						<div class="min-w-0">
							<p class="text-lg font-semibold tracking-tight">{hero.title}</p>
							<p class="mt-1 text-sm text-muted-foreground">{hero.detail}</p>
						</div>
					</div>

					<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t pt-4">
						<p class="text-sm text-muted-foreground">
							Last checked {formatRelativeTime(report.checkedAt, now)}
						</p>
						<!-- `connected` is false during SSR (no stream yet), so fall back to the
					     static description there and let the client report drops. -->
						{#if health.connected || !browser}
							<p class="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
								<span class="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true"
								></span> Live · every 30 s
							</p>
						{:else}
							<p class="text-sm font-medium">Reconnecting…</p>
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- Response time — what the bars are -->
			<Tooltip.Provider delayDuration={150}>
				<Card>
					<CardHeader class="pb-3">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="space-y-1">
								<CardTitle class="flex items-center gap-2 text-base">
									<ChartBar class="size-4 text-muted-foreground" aria-hidden="true" />
									Response time
									<Tooltip.Root>
										<Tooltip.Trigger
											class="inline-flex size-6 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
											aria-label="What are these bars?"
										>
											<Info class="size-3.5 text-muted-foreground" aria-hidden="true" />
										</Tooltip.Trigger>
										<Tooltip.Content side="top" class="max-w-75 text-xs leading-relaxed">
											Each bar is one server-side probe to
											<code class="rounded bg-muted px-1 py-0.5 font-mono">GET /api/v1/health</code>
											every 30 s. Height = round-trip latency relative to the slowest probe in the window.
										</Tooltip.Content>
									</Tooltip.Root>
								</CardTitle>
								<p class="text-sm text-muted-foreground">
									Last {history.length} probes · 30 s interval · ~{Math.ceil(
										(history.length * 30) / 60
									)} min window · oldest → newest
								</p>
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<Badge variant="outline" class="gap-1.5 font-mono text-xs tabular-nums">
									<Timer class="size-3.5" aria-hidden="true" /> avg {avgLatency} ms
								</Badge>
								{#if failCount > 0}
									<Badge variant="destructive" class="gap-1.5 text-xs">
										<CircleX class="size-3.5" aria-hidden="true" />
										{failCount} failed
									</Badge>
								{:else if history.length > 1}
									<Badge variant="secondary" class="gap-1.5 text-xs">
										<CircleCheck class="size-3.5" aria-hidden="true" /> all ok
									</Badge>
								{/if}
							</div>
						</div>
					</CardHeader>
					<CardContent class="space-y-4">
						{#if history.length > 1}
							<div class="flex gap-3">
								<!-- Y-axis scale -->
								<div
									class="flex h-14 flex-col justify-between py-0.5 text-right text-[10px] leading-none text-muted-foreground tabular-nums"
									aria-hidden="true"
								>
									<span>{maxLatency} ms</span>
									<span>{Math.round(maxLatency / 2)} ms</span>
									<span>0</span>
								</div>
								<!-- Bars + grid — clustered, not stretched -->
								<div class="relative flex-1 rounded-lg border bg-muted/30 px-3 py-2">
									<div
										class="absolute inset-x-3 inset-y-2 flex flex-col justify-between"
										aria-hidden="true"
									>
										<div class="border-t border-dashed border-border/50"></div>
										<div class="border-t border-dashed border-border/50"></div>
										<div class="border-t border-border/30"></div>
									</div>
									<div
										class="relative flex h-14 items-end justify-start gap-1"
										role="img"
										aria-label="Latency history: {history.length} probes, average {avgLatency} ms, max {maxLatency} ms, {failCount} failed"
									>
										{#each history as sample, i (i)}
											<Tooltip.Root>
												<Tooltip.Trigger
													class="group flex items-end justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none"
													aria-label={barLabel(sample, i)}
												>
													<span
														class={cn(
															'w-2 rounded-full transition-all duration-300',
															sample.ok
																? 'bg-primary group-hover:bg-primary/80 group-focus-visible:bg-primary'
																: 'bg-destructive group-hover:bg-destructive/80',
															i === history.length - 1 &&
																sample.ok &&
																'ring-1 ring-primary/30 ring-offset-1 ring-offset-card'
														)}
														style="height: {barHeight(sample)}px"
													></span>
												</Tooltip.Trigger>
												<Tooltip.Content side="top" sideOffset={6} class="text-xs">
													<p class="font-medium tabular-nums">
														{sample.ok ? `${sample.latencyMs} ms` : 'Failed — no response'}
													</p>
													<p class="text-xs opacity-80">
														{formatRelativeTime(sample.checkedAt, now)} · probe {i +
															1}/{history.length}
													</p>
												</Tooltip.Content>
											</Tooltip.Root>
										{/each}
									</div>
								</div>
							</div>
							<div
								class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"
							>
								<div class="flex flex-wrap items-center gap-4">
									<span class="inline-flex items-center gap-1.5"
										><span class="size-2 rounded-full bg-primary" aria-hidden="true"></span> success
										({history.length - failCount})</span
									>
									<span class="inline-flex items-center gap-1.5"
										><span class="size-2 rounded-full bg-destructive" aria-hidden="true"></span>
										failed ({failCount})</span
									>
									<span class="hidden items-center gap-1 sm:inline-flex"
										><Gauge class="size-3" aria-hidden="true" /> min {minLatency} ms · max {maxLatency}
										ms</span
									>
								</div>
								<span class="inline-flex items-center gap-1"
									><Clock class="size-3" aria-hidden="true" /> newest on right →</span
								>
							</div>
						{:else}
							<div class="rounded-lg border border-dashed p-6 text-center">
								<div class="mx-auto flex size-8 items-center justify-center rounded-full bg-muted">
									<ChartBar class="size-4 text-muted-foreground" aria-hidden="true" />
								</div>
								<p class="mt-3 text-sm font-medium">Collecting round trips…</p>
								<p class="mt-1 text-xs text-muted-foreground">
									Need at least 2 probes (60 s) to draw the history. Bars show latency relative to
									the slowest probe in the window.
								</p>
								<div class="mt-4 flex justify-center gap-1" aria-hidden="true">
									{#each Array(8) as _, i (i)}
										<span
											class="h-6 w-1.5 animate-pulse rounded-full bg-muted"
											style="animation-delay: {i * 120}ms"
										></span>
									{/each}
								</div>
							</div>
						{/if}
					</CardContent>
				</Card>
			</Tooltip.Provider>

			<!-- Numbers -->
			<Card>
				<CardContent class="grid gap-6 pt-6 sm:grid-cols-3">
					<div>
						<p class="text-sm text-muted-foreground">Version</p>
						<p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
							v{snapshot.version}
						</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Process uptime</p>
						<p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
							{prettyMilliseconds(Math.max(1, snapshot.uptimeSec) * 1000, {
								unitCount: 2,
								secondsDecimalDigits: 0
							})}
						</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Queued posts</p>
						<p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
							{snapshot.pending}
						</p>
					</div>
				</CardContent>
			</Card>

			<!-- Checks -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Activity class="size-4" aria-hidden="true" /> Checks
					</CardTitle>
				</CardHeader>
				<CardContent class="p-0">
					<ul class="divide-y divide-border border-t">
						{#each rows as row (row.id)}
							<li class="flex items-start gap-3 px-6 py-4">
								<span class="mt-0.5" aria-hidden="true">
									{#if row.state === 'ok'}
										<CircleCheck class="size-5 text-primary" />
									{:else}
										<CircleX class="size-5 text-destructive" />
									{/if}
								</span>
								<span class="sr-only">{row.state === 'ok' ? 'Operational' : 'Failed'}</span>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
										<p class="text-sm font-medium">{row.label}</p>
										<p class="text-sm text-muted-foreground tabular-nums">{row.meta}</p>
									</div>
									<p class="mt-1 truncate text-sm text-muted-foreground" title={row.detail}>
										{row.detail}
									</p>
								</div>
							</li>
						{/each}
					</ul>
				</CardContent>
			</Card>

			<!-- Raw response -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Radio class="size-4" aria-hidden="true" /> API response
					</CardTitle>
					<CardAction>
						<div class="flex items-center gap-2">
							{#if probe.statusCode}
								<Badge variant={probe.ok ? 'default' : 'destructive'} class="tabular-nums">
									{probe.statusCode} · {probe.latencyMs} ms
								</Badge>
							{/if}
							<Button variant="outline" size="sm" class="gap-2" onclick={copyResponse}>
								<Copy class="size-4" aria-hidden="true" /> Copy
							</Button>
						</div>
					</CardAction>
				</CardHeader>
				<CardContent>
					<pre
						class="rounded-lg border bg-muted/40 p-4 font-mono text-sm whitespace-pre-wrap"
						aria-label="JSON response from the health endpoint">{responseJson}</pre>
				</CardContent>
			</Card>

			<p class="text-sm text-muted-foreground">
				Checks stream from the server every 30 s and hit the public endpoint — the same path deploy
				platforms and the MCP <code class="font-mono">aghara_health</code> tool use.
			</p>
		</div>
	</svelte:boundary>
</div>
