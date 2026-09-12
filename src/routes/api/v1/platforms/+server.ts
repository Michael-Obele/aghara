// GET /api/v1/platforms — capability matrix (limits + thread/split features).
// Bearer auth. Lets MCP clients warn about thread splits before scheduling.
import { json } from '@sveltejs/kit';
import { listPlatforms } from '$lib/server/providers';
import { apiError, requireBearer } from '$lib/server/api';

export async function GET({ request }) {
	try {
		await requireBearer(request);
		return json(listPlatforms());
	} catch (err) {
		return apiError(err);
	}
}
