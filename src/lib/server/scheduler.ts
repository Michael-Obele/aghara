// Minutely scheduler — polls due scheduled_posts and publishes them.
// Arming is idempotent: hooks.server.ts may call startScheduler() again after a
// dev module reload, and that must never stack a second cron.
import { publishDue } from './services/publisher';
import { pruneHistory } from './services/retention';
import { keyFingerprint } from './services/crypto';

// The single source of truth for "is the cron armed, and when did it last run?".
// Kept on globalThis on purpose: Vite can instantiate server modules more than
// once in dev, so a module-local flag could both lie about a running cron and
// arm a second one. One shared object, one answer.
const runtime = (globalThis.__aghara_scheduler_runtime ??= {
	running: false,
	lastTickAt: null as number | null
});

/** Liveness for the health screen — is the minutely publisher armed, and when did it last sweep? */
export function schedulerStatus(): { running: boolean; lastTickAt: number | null } {
	return { running: runtime.running, lastTickAt: runtime.lastTickAt };
}

export function startScheduler(): void {
	// The runtime object is the only guard — it is shared across module copies.
	if (runtime.running) return;

	// Bun's native in-process cron (runs under Bun in dev and prod).
	// No-overlap is built in: the next fire is scheduled only after the callback
	// settles, so a slow publishDue() never stacks a redundant concurrent sweep.
	// After a sleep or blocked loop it fires once (late) and publishDue() catches
	// up every row with runAt <= now — no per-minute "missed execution" warning
	// spam (the node-cron failure mode this replaces).
	Bun.cron('* * * * *', async () => {
		runtime.lastTickAt = Date.now();
		try {
			const processed = await publishDue();
			if (processed > 0) {
				console.log(`[aghara] scheduler: processed ${processed} due post(s)`);
			}
			// Auto-delete: prune finished rows older than 7d for users who
			// haven't opted into retainHistory. Same tick, no new cron.
			await pruneHistory();
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
	console.log(`[aghara] scheduler started (every minute) key=${keyFingerprint()}`);
}
