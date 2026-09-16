<script lang="ts">
	import { browser } from '$app/environment';
	import { checkNow, getHealthLive } from '$lib/remote';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';
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
		AnnotationPoint,
		AnnotationRange,
		Area,
		AreaChart,
		Axis,
		BarChart,
		Bars,
		ChartGroup,
		Highlight,
		Layer,
		LinearGradient,
		Spline,
		Threshold,
		Tooltip as ChartTooltip,
		type ChartState
	} from 'layerchart';
	import { scaleLog, scaleTime } from 'd3-scale';
	import { timeSecond } from 'd3-time';
	import { curveMonotoneX } from 'd3-shape';
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
	/** Latest liveness probe — "can the API answer HTTP?" (no database involved). */
	const live = $derived(report.live);
	/** The deep payload (database + scheduler); null while the API is unreachable. */
	const snapshot = $derived(report.snapshot);
	const issues = $derived(snapshot?.checks.filter((check) => check.state !== 'ok') ?? []);
	/** When the deep check last ran — the Checks card shows its age, not a pretence. */
	const deepChecked = $derived(report.deep ? new Date(report.deep.at) : null);

	let now = $state(new Date());
	/** Countdown to the next probe, from the scheduler's memory — ticks with `now`. */
	const nextProbeIn = $derived(
		report.scheduler.nextProbeAt === null
			? null
			: Math.max(0, report.scheduler.nextProbeAt - now.getTime())
	);

	// The charts read the server's shared window (services/health-watch.ts): the
	// probe stream belongs to the app, not to this tab. A refresh — or a visitor who
	// arrives after an outage — sees the same history everyone else sees.
	type Probe = { at: Date; latency: number | null; failed: number; baseline: number | null };

	// Page copy reads the watch's interval, so wording can never disagree with how
	// often a probe actually happens. (The bars measure the spacing on screen
	// instead — see `barInterval` — because a window can outlive a cadence change.)
	const probeSeconds = $derived(Math.round(report.probeIntervalMs / 1000));
	// Durations come from pretty-ms (already a dependency, and dependency-free
	// itself) rather than hand-rolled thresholds — it keeps every unit, so an
	// hour and a half never collapses into a rounded-down "1 hour".
	/** "15 minutes" — how far apart probes are, straight from the watch's interval. */
	const intervalLabel = $derived(prettyMilliseconds(report.probeIntervalMs, { verbose: true }));
	// Shared by both charts so the probes line up column-for-column across the two
	// rows; each chart adds its own top/bottom room for the axes it carries.
	const PLOT_PADDING = { left: 44, right: 8 };

	/** Wall-clock time of a probe, for the chart tooltip. */
	function probeTime(at: Date): string {
		return at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	}

	/** The probes that answered — the only ones with a round trip to average. */
	const okSamples = $derived(report.history.filter((sample) => sample.ok));
	const avgLatency = $derived(
		okSamples.length
			? Math.round(okSamples.reduce((sum, sample) => sum + sample.latencyMs, 0) / okSamples.length)
			: 0
	);
	const failCount = $derived(report.history.length - okSamples.length);
	/**
	 * The window's average, as a plottable series. The latency axis is logarithmic
	 * (see the chart below) and a log scale has no zero, so a window in which
	 * nothing answered has no baseline to draw — the chart falls back to a plain
	 * area rather than to a broken scale.
	 */
	const baseline = $derived(okSamples.length > 0 ? Math.max(1, avgLatency) : null);
	/** The slowest probe in the window — the one spike worth naming out loud. */
	const worst = $derived(
		okSamples.length ? okSamples.reduce((a, b) => (b.latencyMs > a.latencyMs ? b : a)) : null
	);

	const probes = $derived<Probe[]>(
		report.history.map((sample) => ({
			at: new Date(sample.at),
			latency: sample.ok ? sample.latencyMs : null,
			failed: sample.ok ? 0 : 1,
			baseline
		}))
	);
	/** A failed probe has no round trip to plot, so the line and its band break there. */
	const hasLatency = (probe: Probe) => probe.latency !== null;
	/**
	 * Equal rungs. On a log axis only a constant ratio puts the labels the same
	 * distance apart — the obvious 10 / 50 / 100 / 500 / 1K set reads cramped,
	 * spaced, cramped, spaced, because 50→100 is half the jump of 10→50. Doubling
	 * makes every rung exactly 0.301 decades wide, so every gap is identical; a
	 * window too tall for a 2× ladder steps by whole decades instead — equally
	 * uniform, just coarser.
	 */
	const latencyTicks = $derived.by(() => {
		const values = okSamples.map((sample) => Math.max(1, sample.latencyMs));
		if (values.length === 0) return [10, 20, 40, 80, 160];
		const low = Math.min(...values);
		const high = Math.max(...values);
		// Pick the finest ladder that still leaves the labels room to breathe: a 2×
		// ladder over a 250× window is nine rungs, which crowds a plot this tall, so
		// the ratio steps up to 4× or 10× until the count fits — every ratio keeps
		// the gaps identical.
		const span = Math.log10(high / low);
		const ratio = [2, 4, 10].find((candidate) => span / Math.log10(candidate) <= 5) ?? 10;
		const rungs: number[] = [];
		// Start one rung below the fastest round trip, then climb past the slowest.
		let value = 10 ** Math.floor(Math.log10(low));
		while (value * ratio < low) value *= ratio;
		for (; rungs.length < 8 && value <= high * ratio; value *= ratio) rungs.push(value);
		return rungs;
	});
	/** The ladder is the axis — no rung sits below a plot line it cannot reach. */
	const latencyDomain = $derived<[number, number]>([
		latencyTicks[0] ?? 1,
		latencyTicks[latencyTicks.length - 1] ?? 100
	]);
	// Bar width comes from the spacing actually on screen, never from the configured
	// cadence: a window that spans a cadence change (the watch probed every minute
	// until 2026-09-15) would otherwise paint 15-minute bars under one-minute
	// samples. The median gap is the honest single width for the bulk of the window.
	const probeGapMs = $derived.by(() => {
		if (probes.length < 2) return Math.max(1, probeSeconds) * 1000;
		const gaps = probes
			.slice(1)
			.map((probe, index) => +probe.at - +probes[index].at)
			.sort((a, b) => a - b);
		return Math.max(1, gaps[Math.floor(gaps.length / 2)]);
	});
	const barInterval = $derived(timeSecond.every(Math.max(1, Math.round(probeGapMs / 1000))));
	/**
	 * Contiguous runs of failed probes, each padded to one probe's width so that a
	 * single miss is still a visible span. Drawn behind the latency area: without
	 * them a failure is just a hole in the line, with nothing to say when it
	 * started or how long it lasted.
	 */
	const outages = $derived.by<[Date, Date][]>(() => {
		const runs: [number, number][] = [];
		let start: number | null = null;
		let end = 0;
		for (const sample of report.history) {
			if (sample.ok) {
				if (start !== null) runs.push([start, end]);
				start = null;
			} else {
				start ??= sample.at;
				end = sample.at;
			}
		}
		if (start !== null) runs.push([start, end]);
		const half = probeGapMs / 2;
		return runs.map(([from, to]) => [new Date(from - half), new Date(to + half)] as [Date, Date]);
	});
	/** How wide the window actually is — measured from the samples, never assumed. */
	const windowMinutes = $derived(
		probes.length > 1
			? Math.max(1, Math.round((+probes[probes.length - 1].at - +probes[0].at) / 60_000))
			: 0
	);
	/** "2 days 2 hours" — the history currently on screen, in words. */
	const windowLabel = $derived(
		prettyMilliseconds(Math.max(1, windowMinutes) * 60_000, { verbose: true })
	);

	// Timers only — freshness ticker, so "checked 42s ago" stays honest.
	$effect(() => {
		const id = setInterval(() => {
			now = new Date();
		}, 15000);
		return () => clearInterval(id);
	});

	const hero = $derived.by(() => {
		if (!live) {
			return {
				tone: 'down' as const,
				title: 'Waiting for the first probe',
				detail: `The watch probes ${intervalLabel}.`
			};
		}
		if (!live.ok) {
			return {
				tone: 'down' as const,
				title: 'API unreachable',
				detail: live.error ?? 'The public endpoint did not respond.'
			};
		}
		if (!snapshot) {
			// The API answers; the database-backed check just hasn't landed yet.
			return {
				tone: 'ok' as const,
				title: 'API responding',
				detail: 'Waiting for the first deep check — database and scheduler.'
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
			state: live?.ok ? 'ok' : 'fail',
			meta: live?.statusCode ? `HTTP ${live.statusCode} · ${live.latencyMs} ms` : 'no response',
			detail: live?.error ?? `GET ${live?.url ?? report.livenessPath}`
		};
		const checks: ScreenRow[] = (snapshot?.checks ?? []).map((check) => ({
			id: check.id,
			label: check.label,
			state: check.state,
			meta: check.latencyMs === null ? `every ${intervalLabel}` : `${check.latencyMs} ms`,
			detail: check.detail
		}));
		return [api, ...checks];
	});

	/** How wide the whole window is, in ms — where the tick format starts. */
	const dataSpanMs = $derived(
		probes.length > 1 ? +probes[probes.length - 1].at - +probes[0].at : 0
	);

	/** The width of a chart's x-domain, whatever a brush zoom has left it as. */
	function domainSpanMs(domain: unknown): number | null {
		if (!Array.isArray(domain) || domain.length < 2) return null;
		const toMs = (value: unknown) =>
			value instanceof Date ? value.getTime() : typeof value === 'number' ? value : NaN;
		const span = Math.abs(toMs(domain[1]) - toMs(domain[0]));
		return Number.isFinite(span) ? span : null;
	}

	// X-axis ticks, in the reader's locale: seconds only while the window is short
	// enough that ticks land sub-minute (which would otherwise repeat a label), a
	// bare "1:40 PM" for the usual hour or two, then a date once a bare time stops
	// meaning anything. The span it reads is the one on screen, not the one in the
	// data — brush into a ten-minute slice and the labels have to come with you.
	function tickFormatFor(spanMs: number) {
		const options: Intl.DateTimeFormatOptions =
			spanMs > 7 * 86_400_000
				? { month: 'short', day: 'numeric' }
				: spanMs > 6 * 3_600_000
					? { month: 'short', day: 'numeric', hour: 'numeric' }
					: spanMs > 5 * 60_000
						? { hour: 'numeric', minute: '2-digit' }
						: { hour: 'numeric', minute: '2-digit', second: '2-digit' };
		return (value: Date | string | number) => new Date(value).toLocaleString(undefined, options);
	}

	// The two charts share their x-domain through the ChartGroup, so a brush drag on
	// either one zooms both. Reading the domain back is what lets each axis' tick
	// labels follow the zoom instead of labelling the window they left behind.
	let latencyChart = $state<ChartState>();
	let errorsChart = $state<ChartState>();
	const latencyTickFormat = $derived(
		tickFormatFor(domainSpanMs(latencyChart?.xDomain) ?? dataSpanMs)
	);
	const errorsTickFormat = $derived(
		tickFormatFor(domainSpanMs(errorsChart?.xDomain) ?? dataSpanMs)
	);

	const responseJson = $derived(
		JSON.stringify(snapshot ?? { error: live?.error ?? 'No response from the endpoint' }, null, 2)
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
		<Button
			variant="outline"
			class="gap-2"
			disabled={checkNow.pending > 0}
			onclick={() => void checkNow()}
		>
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
							Last checked {deepChecked ? formatRelativeTime(deepChecked, now) : '—'}
						</p>
						<!-- `connected` is false during SSR (no stream yet), so fall back to the
					     static description there and let the client report drops. -->
						{#if health.connected || !browser}
							<p class="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
								<span class="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true"
								></span>
								{#if nextProbeIn !== null}
									Next probe in {prettyMilliseconds(nextProbeIn, { secondsDecimalDigits: 0 })}
								{:else}
									Live · {intervalLabel}
								{/if}
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
					<!-- No `pointer.tooltip: false` here on purpose: the group's default is
					     what makes one hover read both cards — the same probe reports its
					     latency above and its outcome below, each tooltip anchored to its
					     own chart. -->
					<ChartGroup>
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
											The server probes every {intervalLabel} —
											<code class="rounded bg-muted px-1 py-0.5 font-mono">GET /api/v1/ping</code>
											— liveness only, no database — and keeps every sample here, so this window is the
											same one everybody sees. The top chart plots the round trip on a logarithmic scale,
											where doubling is one step wherever you are, so a 700 ms spike and a 30 ms baseline
											both stay readable; its fill turns amber wherever the round trip ran slower than
											this window's average. The bottom one bars the probes that failed, and any run of
											them is shaded in the chart above. Hover either chart to inspect a probe; drag across
											one to zoom both, and click to reset.
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
									Last {probes.length} probes · ~{windowLabel} of history. Drag to zoom, click to reset.
								</p>
								<!-- Latency: the round trip each probe measured. The area breaks
								     where a probe failed — there is no round trip to plot. -->
								<AreaChart
									bind:context={latencyChart}
									data={probes}
									x="at"
									y={['latency', 'baseline']}
									yScale={scaleLog()}
									yDomain={latencyDomain}
									brush
									height={190}
									padding={{ ...PLOT_PADDING, top: 26, bottom: 22 }}
									tooltipContext={{ mode: 'bisect-x' }}
								>
									<Layer>
										<!-- Failures first, so the line paints over them: an outage then
										     reads as the span it happened in plus the hole it left, not as
										     an unexplained gap. -->
										{#each outages as range (range[0].getTime())}
											<AnnotationRange
												x={range}
												fill="var(--color-destructive)"
												label={outages.length === 1 ? 'outage' : undefined}
												labelPlacement="top"
												props={{
													rect: { fillOpacity: 0.18 },
													label: { class: 'fill-destructive font-medium' }
												}}
											/>
										{/each}
										<!-- Grid lines only, no axis rule: the plot's own edges are the frame. -->
										<Axis
											placement="left"
											grid={{ class: '[--stroke-color:var(--color-border)]' }}
											format="integer"
											tickMarks={false}
											ticks={latencyTicks}
											classes={{
												tickLabel: 'fill-muted-foreground text-xs tabular-nums'
											}}
										/>
										<Axis
											placement="bottom"
											rule
											tickMarks={false}
											tickSpacing={110}
											format={latencyTickFormat}
											classes={{
												tickLabel: 'fill-muted-foreground text-xs tabular-nums'
											}}
										/>
										<!-- The round trip against the window's average, as two tinted
										     bands rather than one flat fill: the colour changes where the
										     line crosses the average, so "slower than normal" is something
										     the reader sees instead of subtracts. The log axis is what
										     keeps both bands on screen — linearly, one 700 ms spike owns
										     the whole plot and the typical round trip collapses into the
										     bottom few pixels. -->
										{#if baseline !== null}
											<Threshold curve={curveMonotoneX} defined={hasLatency}>
												{#snippet below({ curve })}
													<Area
														y0="latency"
														y1="baseline"
														{curve}
														defined={hasLatency}
														class="fill-primary/25"
													/>
												{/snippet}
												{#snippet above({ curve })}
													<Area
														y0="latency"
														y1="baseline"
														{curve}
														defined={hasLatency}
														class="fill-warning/45"
													/>
												{/snippet}
												{#snippet children({ curve })}
													<Spline
														y="baseline"
														{curve}
														class="stroke-muted-foreground/50 [stroke-dasharray:3_3]"
													/>
													<Spline
														y="latency"
														{curve}
														defined={hasLatency}
														class="stroke-primary stroke-2"
													/>
												{/snippet}
											</Threshold>
										{:else}
											<Area
												curve={curveMonotoneX}
												defined={hasLatency}
												line={{ class: 'stroke-2 stroke-primary' }}
												class="fill-primary/25"
											/>
										{/if}
										<!-- The window's slowest probe, named by number: the one point a
										     reader would otherwise have to hover to identify. -->
										{#if worst}
											<AnnotationPoint
												x={new Date(worst.at)}
												y={worst.latencyMs}
												r={4}
												label={`${worst.latencyMs} ms`}
												labelPlacement="top"
												props={{
													circle: { class: 'fill-warning stroke-card' },
													label: { class: 'fill-warning text-xs font-medium' }
												}}
											/>
										{/if}
										<Highlight
											points={{ r: 4, class: 'fill-primary stroke-card', strokeWidth: 2 }}
											lines={{ class: 'stroke-muted-foreground/40 [stroke-dasharray:3_3]' }}
										/>
									</Layer>

									<ChartTooltip.Root x="data" y="data" anchor="bottom" yOffset={-8}>
										{#snippet children({ data })}
											<ChartTooltip.Header>
												{probeTime(data.at)} · {formatRelativeTime(data.at, now)}
											</ChartTooltip.Header>
											<ChartTooltip.List>
												<ChartTooltip.Item
													label="round trip"
													value={data.latency === null ? 'no response' : `${data.latency} ms`}
													color={data.latency === null
														? 'var(--color-destructive)'
														: 'var(--color-primary)'}
												/>
											</ChartTooltip.List>
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
									bind:context={errorsChart}
									data={probes}
									x="at"
									xScale={scaleTime()}
									xInterval={barInterval}
									y="failed"
									yDomain={[0, 1]}
									brush
									height={72}
									padding={{ ...PLOT_PADDING, top: 6, bottom: 20 }}
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
											format={errorsTickFormat}
											classes={{
												tickLabel: 'fill-muted-foreground text-xs tabular-nums'
											}}
										/>
										<LinearGradient
											class="from-destructive to-destructive/35"
											vertical
											units="userSpaceOnUse"
										>
											{#snippet children({ gradient })}
												<Bars fill={gradient} radius={4} rounded="top" insets={{ x: 1 }} />
											{/snippet}
										</LinearGradient>
										<!-- The hovered probe's own column, so a failure reads against its
										     neighbours instead of floating on its own. -->
										<Highlight bar={{ class: 'fill-muted-foreground/10' }} />
									</Layer>

									<ChartTooltip.Root x="data" y="data" anchor="bottom" yOffset={-8}>
										{#snippet children({ data })}
											<ChartTooltip.Header>
												{probeTime(data.at)} · {formatRelativeTime(data.at, now)}
											</ChartTooltip.Header>
											<ChartTooltip.List>
												<ChartTooltip.Item
													label="outcome"
													value={data.failed ? 'no response' : 'ok'}
													color={data.failed ? 'var(--color-destructive)' : 'var(--color-primary)'}
												/>
											</ChartTooltip.List>
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
							v{snapshot?.version ?? '—'}
						</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Process uptime</p>
						<p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
							{snapshot
								? prettyMilliseconds(Math.max(1, snapshot.uptimeSec) * 1000, {
										unitCount: 2,
										secondsDecimalDigits: 0
									})
								: '—'}
						</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Queued posts</p>
						<p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
							{report.scheduler.pending}
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
							{#if report.deep?.statusCode}
								<Badge variant={report.deep.ok ? 'default' : 'destructive'} class="tabular-nums">
									{report.deep.statusCode} · {report.deep.latencyMs} ms
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
				The server probes its own public endpoint every {intervalLabel} and keeps every sample, so everyone
				sees the same window — and a refresh never empties it. The deep check (database + scheduler) runs
				on a slow window plus whenever you press Check now: the same path deploy platforms and the MCP
				<code class="font-mono">aghara_health</code> tool use.
			</p>
		</div>
	</svelte:boundary>
</div>
