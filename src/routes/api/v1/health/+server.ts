// GET /api/v1/health — public status endpoint (deploy health checks + the
// in-app system health screen). Additive: `status`, `version`, `pending` keep
// their original meanings; `uptimeSec` and `checks` are new. 503 = down.
import { json } from '@sveltejs/kit';
import { getHealthSnapshot } from '$lib/server/services/health';

export async function GET() {
	const snapshot = await getHealthSnapshot();
	return json(snapshot, { status: snapshot.status === 'down' ? 503 : 200 });
}
