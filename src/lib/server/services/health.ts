// Health service — one source of truth for the public /api/v1/health payload and
// the in-app system health screen. Additive: `status`, `version` and `pending`
// keep their original meanings, so deploy health checks and the MCP tool that
// forwards to this endpoint are unaffected.
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { scheduledPosts } from '$lib/server/db/schema';
import { schedulerStatus } from '$lib/server/scheduler';
// The app's real version (`$app/environment`'s `version` is a build timestamp —
// SvelteKit uses it for stale-deploy detection, so it is not app-facing here).
import pkg from '../../../../package.json';

export type HealthStatus = 'ok' | 'degraded' | 'down';
export type HealthCheckState = 'ok' | 'fail';

export interface HealthCheck {
	/** Stable id so the UI can key rows — 'database' | 'scheduler'. */
	id: string;
	label: string;
	state: HealthCheckState;
	/** Round trip of the check itself, when measurable. */
	latencyMs: number | null;
	detail: string;
}

export interface HealthSnapshot {
	status: HealthStatus;
	version: string;
	/** Queued scheduled posts waiting for their run time (all users). */
	pending: number;
	uptimeSec: number;
	checks: HealthCheck[];
}

/** How long a scheduler gap may get before it reads as stalled. */
const SCHEDULER_STALL_MS = 180_000;

export async function getHealthSnapshot(): Promise<HealthSnapshot> {
	const checks: HealthCheck[] = [];

	// Database — the same COUNT the public endpoint has always reported, timed.
	const dbStarted = performance.now();
	let pending = 0;
	let dbError: string | null = null;
	try {
		const [row] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(scheduledPosts)
			.where(eq(scheduledPosts.status, 'queued'));
		pending = row?.count ?? 0;
	} catch (err) {
		dbError = err instanceof Error ? err.message : 'Database query failed';
	}
	const dbLatencyMs = Math.round(performance.now() - dbStarted);

	checks.push(
		dbError
			? {
					id: 'database',
					label: 'Database',
					state: 'fail',
					latencyMs: dbLatencyMs,
					detail: dbError
				}
			: {
					id: 'database',
					label: 'Database',
					state: 'ok',
					latencyMs: dbLatencyMs,
					detail: `${pending} queued post${pending === 1 ? '' : 's'} waiting`
				}
	);
	checks.push(schedulerCheck());

	// Database down = the API cannot serve; anything else is degraded.
	const status: HealthStatus = dbError
		? 'down'
		: checks.every((check) => check.state === 'ok')
			? 'ok'
			: 'degraded';

	return { status, version: pkg.version, pending, uptimeSec: Math.round(process.uptime()), checks };
}

/** Scheduler liveness — the minutely publisher is what actually ships posts. */
function schedulerCheck(): HealthCheck {
	const { running, disabled, lastTickAt, nextDueAt, lastSweepAt } = schedulerStatus();
	const base = { id: 'scheduler', label: 'Scheduler', latencyMs: null } as const;

	if (disabled) {
		return {
			...base,
			state: 'ok',
			detail: 'Disabled via SCHEDULER=off — scheduled posts will not run.'
		};
	}

	if (!running) {
		return {
			...base,
			state: 'fail',
			detail:
				'Minutely publisher is not running — scheduled posts will not go out. Restart Aghara to re-arm it.'
		};
	}

	if (lastTickAt === null) {
		return process.uptime() > 120
			? {
					...base,
					state: 'fail',
					detail: 'No sweep since boot — scheduled posts are stuck. Restart Aghara to re-arm it.'
				}
			: { ...base, state: 'ok', detail: 'First sweep runs within the next minute.' };
	}

	const ageMs = Date.now() - lastTickAt;
	if (ageMs > SCHEDULER_STALL_MS) {
		return {
			...base,
			state: 'fail',
			detail: `Last sweep ${formatAge(ageMs)} ago — the scheduler looks stalled.`
		};
	}

	// The tick is a heartbeat that only reads the database when there is work, so
	// say what it is waiting for rather than implying a query every minute.
	const waiting =
		nextDueAt === null
			? 'Queue empty'
			: `Next post in ${formatAge(Math.max(0, nextDueAt - Date.now()))}`;
	const swept =
		lastSweepAt === null
			? 'no sweep since boot'
			: `last sweep ${formatAge(Date.now() - lastSweepAt)} ago`;
	return { ...base, state: 'ok', detail: `Tick ${formatAge(ageMs)} ago. ${waiting} · ${swept}.` };
}

function formatAge(ms: number): string {
	const seconds = Math.round(ms / 1000);
	if (seconds < 90) return `${seconds}s`;
	const minutes = Math.round(seconds / 60);
	if (minutes < 90) return `${minutes}m`;
	return `${Math.round(minutes / 60)}h`;
}
