// Health watch — one probe stream for the whole app.
//
// The scheduler owns the clock (see scheduler.ts): each tick it calls probe(),
// and the sample lands in this module's ring buffer, which is what the status
// page renders. That is what makes the window *shared*: a refresh, a new tab or
// a fresh deploy all read the same stream instead of each collecting its own.
//
// Durability is deliberately lazy. Samples are buffered in memory and flushed to
// Postgres in the scheduler's housekeeping window, never per probe, because Neon
// bills compute time while the database is awake — a probe every minute must not
// become a query every minute. Liveness probes touch no database at all; the deep
// check (which reads the DB) rides the same slow window.
import { desc, lt, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { healthProbes, healthProbeHours } from '$lib/server/db/schema';

export interface HealthSample {
	/** Epoch ms of the probe. */
	at: number;
	ok: boolean;
	latencyMs: number;
	statusCode: number | null;
}

export interface LivenessResult {
	at: number;
	url: string;
	ok: boolean;
	statusCode: number | null;
	latencyMs: number;
	error: string | null;
}

/** The deep check — what a deploy platform or an external monitor sees. */
export interface DeepResult extends LivenessResult {
	body: unknown;
}

/** Liveness path: answers "can this process serve HTTP?" with no database work. */
export const LIVENESS_PATH = '/api/v1/ping';
/** Deep path: the public status contract (database + scheduler), 503 when down. */
export const DEEP_PATH = '/api/v1/health';

/** How often the scheduler probes. Exported so the page copy cannot drift from it. */
export const PROBE_INTERVAL_MS = 60_000;
/** Samples the page renders — 200 × 60 s ≈ 3.3 h. */
const RING_CAPACITY = 200;
/** Buffered samples awaiting a flush; bounds memory while the database is unreachable. */
const FLUSH_CAPACITY = 500;
/** Raw rows kept before they collapse into hourly rollups. */
export const RAW_RETENTION_DAYS = 7;
const PROBE_TIMEOUT_MS = 5_000;

// One object per process, on globalThis for the same reason the scheduler
// runtime lives there: Vite can instantiate server modules more than once.
const runtime = (globalThis.__aghara_health_watch ??= {
	samples: [] as HealthSample[],
	buffered: [] as HealthSample[],
	hydrated: false,
	last: null as LivenessResult | null,
	deep: null as DeepResult | null,
	lastFlushAt: null as number | null
});

/** The origin our own probes hit — the public URL a deploy check would use. */
export function watchOrigin(): string {
	return process.env.ORIGIN ?? `http://localhost:${process.env.PORT ?? 5173}`;
}

/** Probe liveness and record the sample. Never reads the database. */
export async function probe(origin = watchOrigin()): Promise<LivenessResult> {
	const target = new URL(LIVENESS_PATH, origin);
	const started = performance.now();
	let statusCode: number | null = null;
	let error: string | null = null;
	try {
		const res = await fetch(target, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
		});
		statusCode = res.status;
		// We only need the round trip; drop the body rather than hold the stream.
		await res.body?.cancel();
	} catch (err) {
		error = err instanceof Error ? err.message : 'Request failed';
	}

	const result: LivenessResult = {
		at: Date.now(),
		url: target.toString(),
		ok: statusCode !== null && statusCode < 400,
		statusCode,
		latencyMs: Math.round(performance.now() - started),
		error
	};
	runtime.last = result;
	record({
		at: result.at,
		ok: result.ok,
		latencyMs: result.latencyMs,
		statusCode: result.statusCode
	});
	return result;
}

/** Probe the deep path. Callers are responsible for keeping this rare. */
export async function probeDeep(origin = watchOrigin()): Promise<DeepResult> {
	const target = new URL(DEEP_PATH, origin);
	const started = performance.now();
	let statusCode: number | null = null;
	let body: unknown = null;
	let error: string | null = null;
	try {
		const res = await fetch(target, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
		});
		statusCode = res.status;
		body = await res.json().catch(() => null);
	} catch (err) {
		error = err instanceof Error ? err.message : 'Request failed';
	}

	const result: DeepResult = {
		at: Date.now(),
		url: target.toString(),
		ok: statusCode !== null && statusCode < 400 && body !== null,
		statusCode,
		latencyMs: Math.round(performance.now() - started),
		error,
		body
	};
	runtime.deep = result;
	return result;
}

/** Append a sample to the shared window (and to the flush buffer). */
export function record(sample: HealthSample): void {
	runtime.samples.push(sample);
	if (runtime.samples.length > RING_CAPACITY) {
		runtime.samples.splice(0, runtime.samples.length - RING_CAPACITY);
	}
	runtime.buffered.push(sample);
	if (runtime.buffered.length > FLUSH_CAPACITY) {
		runtime.buffered.splice(0, runtime.buffered.length - FLUSH_CAPACITY);
	}
}

/** The window every visitor renders: oldest → newest. */
export function history(): HealthSample[] {
	return runtime.samples.slice();
}

/** Latest liveness probe, if the watch has run one. */
export function lastProbe(): LivenessResult | null {
	return runtime.last;
}

/** Latest deep check, if one has run. Its `at` is what the page shows as an age. */
export function lastDeep(): DeepResult | null {
	return runtime.deep;
}

/**
 * Seed the ring from Postgres. This is what makes a restart, a redeploy or a
 * second instance show the same window instead of an empty chart.
 */
export async function hydrate(): Promise<void> {
	if (runtime.hydrated) return;
	const rows = await db
		.select({
			checkedAt: healthProbes.checkedAt,
			ok: healthProbes.ok,
			latencyMs: healthProbes.latencyMs,
			statusCode: healthProbes.statusCode
		})
		.from(healthProbes)
		.orderBy(desc(healthProbes.checkedAt))
		.limit(RING_CAPACITY);

	if (rows.length > 0) {
		runtime.samples = rows
			.map((row) => ({
				at: new Date(row.checkedAt).getTime(),
				ok: row.ok,
				latencyMs: row.latencyMs,
				statusCode: row.statusCode
			}))
			.reverse();
	}
	runtime.hydrated = true;
}

/**
 * Write buffered samples in a single statement. Anything still buffered when
 * this throws stays buffered and goes out with the next window — a database
 * outage must cost us samples only if it outlives the buffer.
 */
export async function flush(): Promise<number> {
	if (runtime.buffered.length === 0) return 0;
	const rows = runtime.buffered.map((sample) => ({
		checkedAt: new Date(sample.at),
		ok: sample.ok,
		latencyMs: sample.latencyMs,
		statusCode: sample.statusCode
	}));
	await db.insert(healthProbes).values(rows).onConflictDoNothing();
	runtime.buffered = [];
	runtime.lastFlushAt = Date.now();
	return rows.length;
}

/**
 * Collapse raw rows older than the retention window into hourly rollups, then
 * drop them. Rollup runs first: if it throws, the raw rows stay and nothing is
 * lost. Steady state is a couple of MB of raw rows plus ~8.8k rollup rows a year.
 */
export async function rollupAndPrune(nowMs = Date.now()): Promise<void> {
	const cutoff = new Date(nowMs - RAW_RETENTION_DAYS * 86_400_000);
	await db.execute(sql`
		insert into health_probe_hours (bucket, ok_count, fail_count, min_ms, avg_ms, max_ms)
		select
			date_trunc('hour', checked_at),
			(count(*) filter (where ok))::int,
			(count(*) filter (where not ok))::int,
			min(latency_ms),
			round(avg(latency_ms))::int,
			max(latency_ms)
		from health_probes
		where checked_at < ${cutoff}
		group by 1
		on conflict (bucket) do update set
			ok_count = excluded.ok_count,
			fail_count = excluded.fail_count,
			min_ms = excluded.min_ms,
			avg_ms = excluded.avg_ms,
			max_ms = excluded.max_ms
	`);
	await db.delete(healthProbes).where(lt(healthProbes.checkedAt, cutoff));
}
