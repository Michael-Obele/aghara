// Remote function for the system health screen — a live query that streams a
// fresh probe every 30s while the screen is open, so the client renders
// server-owned state instead of polling. Deliberately public (no login): it
// only shows what `/api/v1/health` already serves unauthenticated. Pages never
// fetch /api/v1 directly; the probe runs server-side against the public
// endpoint, so the screen shows exactly what a deploy check (or an external
// monitor) sees. When HTTP fails entirely, the API's own view is replaced by a
// direct in-process snapshot so the screen can still explain what's going on.
import { getRequestEvent, query } from '$app/server';
import { getHealthSnapshot, type HealthSnapshot } from '$lib/server/services/health';

export type { HealthCheck, HealthCheckState, HealthSnapshot } from '$lib/server/services/health';

export interface HealthProbe {
	/** The exact URL that was hit. */
	url: string;
	ok: boolean;
	statusCode: number | null;
	latencyMs: number;
	/** Parsed JSON body, when the endpoint answered with one. */
	body: HealthSnapshot | null;
	error: string | null;
}

export interface HealthReport {
	checkedAt: string;
	probe: HealthProbe;
	/** The API's own report when reachable, otherwise a direct runtime snapshot. */
	snapshot: HealthSnapshot;
}

/** How often the live stream pushes a new probe while the screen stays open. */
const PROBE_INTERVAL_MS = 3000;

export const getHealthLive = query.live(async function* () {
	// `getRequestEvent()` is not an auth check — it only supplies the origin for
	// the self-probe. Read it before the first await: the request context is only
	// guaranteed when the stream starts.
	const { url } = getRequestEvent();
	const target = new URL('/api/v1/health', url.origin);

	// Yields immediately (SSR takes the first value), then every 30s. The
	// "Check now" button calls reconnect(), which restarts this generator.
	while (true) {
		yield await probe(target);
		await sleep(PROBE_INTERVAL_MS);
	}
});

async function probe(target: URL): Promise<HealthReport> {
	const started = performance.now();

	let statusCode: number | null = null;
	let body: HealthSnapshot | null = null;
	let error: string | null = null;
	try {
		const res = await fetch(target, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(5000)
		});
		statusCode = res.status;
		const parsed: unknown = await res.json().catch(() => null);
		if (
			parsed &&
			typeof parsed === 'object' &&
			'status' in parsed &&
			Array.isArray((parsed as HealthSnapshot).checks)
		) {
			body = parsed as HealthSnapshot;
		} else {
			error = `Unexpected response shape (HTTP ${res.status})`;
		}
	} catch (err) {
		error = err instanceof Error ? err.message : 'Request failed';
	}

	return {
		checkedAt: new Date().toISOString(),
		probe: {
			url: target.toString(),
			ok: statusCode !== null && statusCode < 400 && body !== null,
			statusCode,
			latencyMs: Math.round(performance.now() - started),
			body,
			error
		},
		snapshot: body ?? (await getHealthSnapshot())
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
