// Minutely scheduler — polls due scheduled_posts and publishes them.
// Started once from hooks.server.ts (guarded against double-start).
import { schedule } from 'node-cron';
import { publishDue } from './services/publisher';

let started = false;

export function startScheduler(): void {
	if (started) return;
	started = true;

	schedule('* * * * *', async () => {
		try {
			const processed = await publishDue();
			if (processed > 0) {
				console.log(`[aghara] scheduler: processed ${processed} due post(s)`);
			}
		} catch (err) {
			console.error('[aghara] scheduler error:', err);
		}
	});

	console.log('[aghara] scheduler started (every minute)');
}
