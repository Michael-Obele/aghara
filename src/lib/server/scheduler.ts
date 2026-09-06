// Minutely scheduler — polls due scheduled_posts and publishes them.
// Started once from hooks.server.ts (guarded against double-start).
import { publishDue } from './services/publisher';
import { keyFingerprint } from './services/crypto';

let started = false;

export function startScheduler(): void {
	if (started) return;
	started = true;

	// Bun's native in-process cron (runs under Bun in dev and prod).
	// No-overlap is built in: the next fire is scheduled only after the callback
	// settles, so a slow publishDue() never stacks a redundant concurrent sweep.
	// After a sleep or blocked loop it fires once (late) and publishDue() catches
	// up every row with runAt <= now — no per-minute "missed execution" warning
	// spam (the node-cron failure mode this replaces).
	Bun.cron('* * * * *', async () => {
		try {
			const processed = await publishDue();
			if (processed > 0) {
				console.log(`[aghara] scheduler: processed ${processed} due post(s)`);
			}
		} catch (err) {
			// Bun.cron surfaces an unhandled rejection as process exit (code 1)
			// if left uncaught, so keep the try/catch around the whole body.
			console.error('[aghara] scheduler error:', err);
		}
	});

	console.log(`[aghara] scheduler started (every minute) key=${keyFingerprint()}`);
}
