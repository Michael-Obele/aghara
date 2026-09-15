// GET /api/v1/ping — liveness. Answers "can this process serve HTTP?" with no
// database access at all, so deploy health checks and the status page's probe
// stream can run as often as they like without waking the database. The deep
// status contract (database + scheduler, 503 when down) stays at /api/v1/health.
import { json } from '@sveltejs/kit';
import pkg from '../../../../../package.json';

export function GET() {
	return json({
		status: 'ok',
		version: pkg.version,
		uptimeSec: Math.round(process.uptime())
	});
}
