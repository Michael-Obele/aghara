// Minutely heartbeat — publishes due posts, and owns the two slow windows the
// rest of the app hangs off (health history + a real health check).
//
// The tick is arithmetic first, I/O second: the runtime below remembers when the
// next queued post is due, so an idle instance never touches the database. That
// matters because the database bills compute time while it is awake — a poll
// every minute would keep it awake forever, for nothing. The database is read
// when a post is actually due, when a mutation says the plan changed, or in the
// housekeeping window.
//
// Arming is idempotent: hooks.server.ts may call startScheduler() again after a
// dev module reload, and that must never stack a second cron.
import { nextDue, publishDue } from './services/publisher';
import { pruneHistory } from './services/retention';
import { keyFingerprint } from './services/crypto';
import {
	PROBE_INTERVAL_MS,
	flush,
	hydrate,
	probe,
	probeDeep,
	rollupAndPrune
} from './services/health-watch';

/** How long the plan may go unverified before we re-read the queue (safety net). */
const RESYNC_MS = 15 * 60000;
/** The slow window: resync, history flush, deep check, retention. */
const HOUSEKEEPING_MS = 15 * 60000;
/** Finished rows are pruned at most this often, inside housekeeping. */
const PRUNE_MS = 60 * 60000;

// The single source of truth for "is the cron armed, when did it last tick, and
// what is it waiting for?". Kept on globalThis on purpose: Vite can instantiate
// server modules more than once in dev, so a module-local flag could both lie
// about a running cron and arm a second one. One shared object, one answer.
//
// Defaults are filled *into* the stored object, never into a fresh one: the
// stored object is what every module copy (and the armed cron) already holds a
// reference to, so replacing it would split the singleton in two.
const runtime = globalThis.__aghara_scheduler_runtime ?? ({} as SchedulerRuntime);
for (const [key, value] of Object.entries({
	running: false,
	disabled: false,
	lastTickAt: null,
	/** When the next queued post is due; null = the queue is empty. */
	nextDueAt: null,
	/** Queued posts, mirrored from the last resync — the health screen reads this. */
	pending: 0,
	/** A mutation changed the queue; re-read the plan on the next tick. */
	scheduleDirty: true,
	lastSweepAt: null,
	lastProbeAt: null,
	lastResyncAt: null,
	lastHousekeepingAt: null,
	lastPruneAt: null
})) {
	if ((runtime as Record<string, unknown>)[key] === undefined) {
		(runtime as Record<string, unknown>)[key] = value;
	}
}
globalThis.__aghara_scheduler_runtime = runtime;

/** The scheduler's shared state, spelled out — it outlives module reloads. */
interface SchedulerRuntime {
	running: boolean;
	disabled: boolean;
	lastTickAt: number | null;
	nextDueAt: number | null;
	pending: number;
	scheduleDirty: boolean;
	lastSweepAt: number | null;
	lastProbeAt: number | null;
	lastResyncAt: number | null;
	lastHousekeepingAt: number | null;
	lastPruneAt: number | null;
	/** The tick the armed cron calls — reassigned on every module load, so a dev
	 *  reload takes effect without arming a second cron. */
	tick: (() => Promise<void>) | null;
}

export interface SchedulerStatus {
	running: boolean;
	disabled: boolean;
	lastTickAt: number | null;
	nextDueAt: number | null;
	pending: number;
	lastSweepAt: number | null;
	lastHousekeepingAt: number | null;
	/** When the next probe falls due — the card shows this instead of "every minute". */
	nextProbeAt: number | null;
	/** When the next deep check (database + scheduler) falls due. */
	nextDeepAt: number | null;
}

/** Liveness + plan for the health screen. Reads memory only — never the database. */
export function schedulerStatus(): SchedulerStatus {
	const now = Date.now();
	return {
		running: runtime.running,
		disabled: runtime.disabled,
		lastTickAt: runtime.lastTickAt,
		nextDueAt: runtime.nextDueAt,
		pending: runtime.pending,
		lastSweepAt: runtime.lastSweepAt,
		lastHousekeepingAt: runtime.lastHousekeepingAt,
		nextProbeAt: (runtime.lastProbeAt ?? now) + PROBE_INTERVAL_MS,
		nextDeepAt: (runtime.lastHousekeepingAt ?? now) + HOUSEKEEPING_MS
	};
}

/**
 * Tell the scheduler the queue changed. Pass the new run time when it is known
 * (a scheduled post): the deadline is taken immediately, so the post goes out on
 * time without a query. Omit it when the earliest deadline may have moved
 * (cancels, deletes) — the next tick re-reads the plan.
 */
export function noteScheduleChange(runAtMs?: number | null): void {
	runtime.scheduleDirty = true;
	if (typeof runAtMs === 'number') {
		runtime.nextDueAt = runtime.nextDueAt === null ? runAtMs : Math.min(runtime.nextDueAt, runAtMs);
	}
}

export function startScheduler(): void {
	// The runtime object is the only guard — it is shared across module copies.
	if (runtime.running) return;

	if (process.env.SCHEDULER === 'off') {
		runtime.disabled = true;
		console.log('[aghara] scheduler disabled (SCHEDULER=off)');
		return;
	}

	// Bun's native in-process cron (runs under Bun in dev and prod).
	// No-overlap is built in: the next fire is scheduled only after the callback
	// settles. After a sleep or blocked loop it fires once (late) and the sweep
	// catches up every row with runAt <= now — no per-minute "missed execution"
	// warning spam (the node-cron failure mode this replaces).
	Bun.cron('* * * * *', async () => {
		runtime.lastTickAt = Date.now();
		try {
			await runtime.tick?.();
		} catch (err) {
			// Bun.cron surfaces an unhandled rejection as process exit (code 1)
			// if left uncaught, so keep the try/catch around the whole body.
			console.error('[aghara] scheduler error:', err);
		}
	});

	// Claimed only after the cron is armed: if Bun.cron throws (invalid
	// expression, missing Bun global), the health screen keeps reporting "not
	// running" and a later call can still retry.
	runtime.running = true;
	console.log(
		`[aghara] scheduler started (every minute; wake-on-deadline) key=${keyFingerprint()}`
	);
	void warmup();
}

async function tick(): Promise<void> {
	const now = Date.now();

	// The probe feeds the status page's shared window. It is HTTP only — no
	// database — so running it is cheap; it still runs on its own slow interval,
	// which is what lets the compute sleep between checks.
	if (isStale(runtime.lastProbeAt, now, PROBE_INTERVAL_MS)) {
		await probeNow();
	}
	// Something changed the queue, or we have not verified the plan in a while.
	if (runtime.scheduleDirty || isStale(runtime.lastResyncAt, now, RESYNC_MS)) {
		await resync();
	}

	// Real work: the only reason an idle tick touches the database.
	if (runtime.nextDueAt !== null && runtime.nextDueAt <= now) {
		const processed = await publishDue();
		runtime.lastSweepAt = Date.now();
		if (processed > 0) {
			console.log(`[aghara] scheduler: processed ${processed} due post(s)`);
		}
		await resync();
	}

	// The slow window: things that must not happen every minute.
	if (isStale(runtime.lastHousekeepingAt, now, HOUSEKEEPING_MS)) {
		runtime.lastHousekeepingAt = now;
		await housekeeping();
	}
}

/** Boot: seed the shared history, take a first probe, and learn the plan. */
async function warmup(): Promise<void> {
	await attempt('history hydrate', hydrate);
	await probeNow();
	await attempt('deep health check', () => probeDeep());
	await attempt('schedule resync', resync);
}

/**
 * Probe once and remember when, so the boot warm-up and the tick cannot disagree
 * about the cadence. The timestamp is taken first on purpose: a failing probe
 * must not turn into a hot loop.
 */
async function probeNow(): Promise<void> {
	runtime.lastProbeAt = Date.now();
	await attempt('health probe', () => probe());
}

/** One resync = one query: when the next post is due, and how many are waiting. */
async function resync(): Promise<void> {
	const plan = await nextDue();
	runtime.nextDueAt = plan.nextRunAt;
	runtime.pending = plan.pending;
	runtime.scheduleDirty = false;
	runtime.lastResyncAt = Date.now();
}

/** Everything that must not run every minute: durability, the deep check, retention. */
async function housekeeping(): Promise<void> {
	await attempt('history hydrate', hydrate);
	await attempt('history flush', flush);
	await attempt('deep health check', () => probeDeep());
	if (isStale(runtime.lastPruneAt, Date.now(), PRUNE_MS)) {
		runtime.lastPruneAt = Date.now();
		await attempt('prune finished posts', pruneHistory);
		await attempt('roll up health history', () => rollupAndPrune());
	}
}

/** Loose null check on purpose: a timestamp that is somehow missing must fail
 *  open (do the work) rather than silently disable the window it gates. */
function isStale(last: number | null, now: number, window: number): boolean {
	return last == null || now - last >= window;
}

// Rebound on every module load (dev HMR included) so the armed cron always runs
// the current logic — arming itself stays idempotent.
runtime.tick = tick;

/** Run one background step, logging instead of throwing: no step may kill the tick. */
async function attempt(label: string, step: () => Promise<unknown>): Promise<void> {
	try {
		await step();
	} catch (err) {
		console.error(`[aghara] ${label} failed:`, err instanceof Error ? err.message : err);
	}
}
