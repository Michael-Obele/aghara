// DELETE /api/v1/posts/history — hard-delete ALL finished rows
// (posted/failed/canceled). Queued rows are untouched (Bearer).
import { json } from '@sveltejs/kit';
import { clearHistory } from '$lib/server/services/retention';
import { apiError, requireBearer } from '$lib/server/api';

export async function DELETE({ request }) {
	try {
		const { userId } = await requireBearer(request);
		return json(await clearHistory(userId));
	} catch (err) {
		return apiError(err);
	}
}
