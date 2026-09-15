// Remote functions for the system health screen.
//
// The probe stream is owned by the server (services/health-watch.ts, driven by
// the scheduler), so this layer is a pure view: it reads the shared window, the
// last deep check and the scheduler's memory. No visitor probes anything and
// nothing here reads the database, so the page costs the same whether one person
// is watching or a thousand — and every visitor sees the same history.
import { command, getRequestEvent, query } from '$app/server';
import type { HealthSnapshot } from '$lib/server/services/health';
import {
	DEEP_PATH,
	LIVENESS_PATH,
	PROBE_INTERVAL_MS,
	history,
	lastDeep,
	lastProbe,
	probe,
	probeDeep,
	type DeepResult,
	type HealthSample,
	type LivenessResult
} from '$lib/server/services/health-watch';
import { schedulerStatus, type SchedulerStatus } from '$lib/server/scheduler';

export type { HealthCheck, HealthCheckState, HealthSnapshot } from '$lib/server/services/health';
export type { HealthSample, LivenessResult, DeepResult } from '$lib/server/services/health-watch';

export interface HealthReport {
	/** Latest liveness probe — "can the API answer HTTP?" (no database involved). */
	live: LivenessResult | null;
	/** Latest deep check — database + scheduler, the public status contract. */
	deep: DeepResult | null;
	/** The deep payload the page renders; null while the API is unreachable. */
	snapshot: HealthSnapshot | null;
	/** Shared probe window, oldest → newest — identical for every visitor. */
	history: HealthSample[];
	scheduler: SchedulerStatus;
	probeIntervalMs: number;
	livenessPath: string;
	deepPath: string;
}

/** How long "Check now" waits before it forces another check. */
const FORCE_COOLDOWN_MS = 30000;

function report(): HealthReport {
	const deep = lastDeep();
	return {
		live: lastProbe(),
		deep,
		snapshot: (deep?.body as HealthSnapshot | null) ?? null,
		history: history(),
		scheduler: schedulerStatus(),
		probeIntervalMs: PROBE_INTERVAL_MS,
		livenessPath: LIVENESS_PATH,
		deepPath: DEEP_PATH
	};
}

/** Streams the shared state. The stream is a viewer; it never probes on its own. */
export const getHealthLive = query.live(async function* () {
	while (true) {
		yield report();
		await sleep(5000);
	}
});

/**
 * "Check now" — force one liveness probe and one deep check against the origin
 * this visitor is actually talking to (so it works in dev without ORIGIN set).
 * The check is rate-limited: the deep one reads the database, and this endpoint
 * is public.
 */
export const checkNow = command(async () => {
	const { url } = getRequestEvent();
	const since = Date.now() - (lastDeep()?.at ?? 0);
	if (since < FORCE_COOLDOWN_MS) return { forced: false, retryInMs: FORCE_COOLDOWN_MS - since };
	await probe(url.origin);
	await probeDeep(url.origin);
	return { forced: true, retryInMs: FORCE_COOLDOWN_MS };
});

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
