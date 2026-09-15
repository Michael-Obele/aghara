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
		Area,
		AreaChart,
		Axis,
		BarChart,
		Bars,
		ChartGroup,
		Highlight,
		Layer,
		Tooltip as ChartTooltip
	} from 'layerchart';
	import { scaleTime } from 'd3-scale';
	import { timeSecond } from 'd3-time';
	import {
		Activity,
		ChartArea,
		CircleCheck,
		CircleX,
		Copy,
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

	// The chart's view of a probe — one row feeds both charts. `latency` is null on
	// a failure (an outage has no round trip to plot, so the area breaks there) and
	// `failed` is the errors chart's value: 1 marks a failed probe, 0 an okay one.
	type Probe = { at: Date; latency: number | null; failed: number };

	const PROBE_INTERVAL = timeSecond.every(30); // the live query re-probes every 30 s
	// Shared by both charts so the probes line up column-for-column across the two
	// rows; each chart adds its own top/bottom room for the axes it carries.
	const PLOT_PADDING = { left: 44, right: 8 };

	/** Wall-clock time of a probe, for the chart tooltip. */
	function probeTime(at: Date): string {
		return at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	}

	// Round-trip history — appended on every streamed report. This is the one piece
	// of per-viewer history (it survives reconnects), so it can't be derived;
	// the untrack keeps the write from re-triggering this effect.
	let history = $state<Sample[]>([]);
	const MAX_HISTORY = 200;
	const probes = $derived<Probe[]>(
		history.map((sample) => ({
			at: new Date(sample.checkedAt),
			latency: sample.ok ? sample.latencyMs : null,
			failed: sample.ok ? 0 : 1
		}))
	);
	$effect(() => {
		const r = report;
		untrack(() => {
			history = [...history, toSample(r)].slice(-MAX_HISTORY);
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

	const okSamples = $derived(history.filter((s) => s.ok));
	const avgLatency = $derived(
		okSamples.length
			? Math.round(okSamples.reduce((a, b) => a + b.latencyMs, 0) / okSamples.length)
			: 0
	);
	const failCount = $derived(history.filter((s) => !s.ok).length);

	// X-axis ticks, in the reader's locale: seconds only while the window is short
	// enough that ticks land sub-minute (which would otherwise repeat a label), a
	// bare "1:40 PM" for the usual hour or two, then a date once a bare time stops
	// meaning anything.
	const axisTickFormat = $derived.by(() => {
		const spanMs = probes.length > 1 ? +probes[probes.length - 1].at - +probes[0].at : 0;
		const options: Intl.DateTimeFormatOptions =
			spanMs > 36 * 3_600_000
				? { month: 'short', day: 'numeric' }
				: spanMs > 6 * 3_600_000
					? { month: 'short', day: 'numeric', hour: 'numeric' }
					: spanMs > 5 * 60_000
						? { hour: 'numeric', minute: '2-digit' }
						: { hour: 'numeric', minute: '2-digit', second: '2-digit' };
		return (value: Date | string | number) => new Date(value).toLocaleString(undefined, options);
	});

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

			<!-- Latency and errors, as two grouped charts: one hover drives both. -->
			<Tooltip.Provider delayDuration={150}>
				{#if probes.length > 1}
					<ChartGroup pointer={{ tooltip: false }}>
						<!-- Latency -->
						<Card>
							<CardHeader class="pb-3">
								<CardTitle class="flex items-center gap-2 text-base">
									<span class="size-2.5 rounded-full bg-primary" aria-hidden="true"></span>
									Latency <span class="font-normal text-muted-foreground">(ms)</span>
									<Tooltip.Root>
										<Tooltip.Trigger
											class="inline-flex size-6 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
											aria-label="What do these charts show?"
										>
											<Info class="size-3.5 text-muted-foreground" aria-hidden="true" />
										</Tooltip.Trigger>
										<Tooltip.Content side="top" class="max-w-75 text-xs leading-relaxed">
											Each point is one server-side probe to
											<code class="rounded bg-muted px-1 py-0.5 font-mono">GET /api/v1/health</code>
											every 30 s. The top chart plots the round trip over time; the bottom one bars the
											probes that failed. Hover either chart to inspect a probe.
										</Tooltip.Content>
									</Tooltip.Root>
								</CardTitle>
								<CardAction>
									<Badge variant="outline" class="gap-1.5 font-mono text-xs tabular-nums">
										<Timer class="size-3.5" aria-hidden="true" /> avg {avgLatency} ms
									</Badge>
								</CardAction>
							</CardHeader>
							<CardContent class="space-y-4">
								<p class="text-sm text-muted-foreground">
									Last {probes.length} probes · 30 s interval · ~{Math.ceil(probes.length / 2)} min window
								</p>
								<!-- Latency: the round trip each probe measured. The area breaks
								     where a probe failed — there is no round trip to plot. -->
								<AreaChart
									data={probes}
									x="at"
									y="latency"
									yDomain={[0, null]}
									yNice
									height={150}
									padding={{ ...PLOT_PADDING, top: 8, bottom: 22 }}
									tooltipContext={{ mode: 'bisect-x' }}
								>
									<Layer>
										<Axis
											placement="left"
											grid
											rule
											format="metric"
											tickMarks={false}
											classes={{
												tickLabel: 'fill-muted-foreground text-xs tabular-nums'
											}}
										/>
										<Axis
											placement="bottom"
											rule
											tickMarks={false}
											tickSpacing={110}
											format={axisTickFormat}
											classes={{
												tickLabel: 'fill-muted-foreground text-xs tabular-nums'
											}}
										/>
										<Area
											fill="var(--color-primary)"
											fillOpacity={0.15}
											line={{ class: 'stroke-2 stroke-primary' }}
										/>
										<Highlight points lines />
									</Layer>

									<ChartTooltip.Root x="data" y="data" anchor="bottom" yOffset={-8}>
										{#snippet children({ data })}
											<p class="font-medium tabular-nums">
												{data.latency === null ? 'Failed — no response' : `${data.latency} ms`}
											</p>
											<p class="opacity-80">
												{probeTime(data.at)} · {formatRelativeTime(data.at, now)}
											</p>
										{/snippet}
									</ChartTooltip.Root>
								</AreaChart>
							</CardContent>
						</Card>

						<!-- Errors — one bar per failed probe. -->
						<Card>
							<CardHeader class="pb-3">
								<CardTitle class="flex items-center gap-2 text-base">
									<span class="size-2.5 rounded-full bg-destructive" aria-hidden="true"></span>
									Errors
								</CardTitle>
								<CardAction>
									{#if failCount > 0}
										<Badge variant="destructive" class="gap-1.5 text-xs">
											<CircleX class="size-3.5" aria-hidden="true" />
											{failCount} failed
										</Badge>
									{:else}
										<Badge variant="secondary" class="gap-1.5 text-xs">
											<CircleCheck class="size-3.5" aria-hidden="true" /> none
										</Badge>
									{/if}
								</CardAction>
							</CardHeader>
							<CardContent class="relative space-y-4">
								<p class="text-sm text-muted-foreground">Each bar is one failed probe</p>
								<BarChart
									data={probes}
									x="at"
									xScale={scaleTime()}
									xInterval={PROBE_INTERVAL}
									y="failed"
									yDomain={[0, 1]}
									height={110}
									padding={{ ...PLOT_PADDING, top: 6, bottom: 22 }}
									tooltipContext={{ mode: 'bisect-x' }}
								>
									<Layer>
										<Axis
											placement="left"
											rule
											format="integer"
											ticks={[0, 1]}
											tickMarks={false}
											classes={{
												tickLabel: 'fill-muted-foreground text-xs tabular-nums'
											}}
										/>
										<Axis
											placement="bottom"
											rule
											tickMarks={false}
											tickSpacing={110}
											format={axisTickFormat}
											classes={{
												tickLabel: 'fill-muted-foreground text-xs tabular-nums'
											}}
										/>
										<Bars class="fill-destructive" insets={{ x: 1 }} />
										<Highlight lines />
									</Layer>

									<ChartTooltip.Root x="data" y="data" anchor="bottom" yOffset={-8}>
										{#snippet children({ data })}
											<p class="font-medium">
												{data.failed ? 'Failed — no response' : 'Succeeded'}
											</p>
											<p class="opacity-80">
												{probeTime(data.at)} · {formatRelativeTime(data.at, now)}
											</p>
										{/snippet}
									</ChartTooltip.Root>
								</BarChart>

								{#if failCount === 0}
									<!-- Zero failures is the good news — say it out loud rather than
										     leaving an empty plot to be misread as a broken chart. -->
									<p
										class="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm font-medium text-muted-foreground"
									>
										No failed probes in this window
									</p>
								{/if}
							</CardContent>
						</Card>
					</ChartGroup>
				{:else}
					<Card>
						<CardContent>
							<div class="rounded-lg border border-dashed p-6 text-center">
								<div class="mx-auto flex size-8 items-center justify-center rounded-full bg-muted">
									<ChartArea class="size-4 text-muted-foreground" aria-hidden="true" />
								</div>
								<p class="mt-3 text-sm font-medium">Collecting round trips…</p>
								<p class="mt-1 text-xs text-muted-foreground">
									Need at least 2 probes (60 s) to draw the charts. The first tracks round-trip
									latency; the second bars the probes that failed.
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
						</CardContent>
					</Card>
				{/if}
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
