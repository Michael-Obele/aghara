// DELETE /api/v1/scheduled/[id] — cancel a queued post (Bearer).
import { json } from '@sveltejs/kit';
import { cancelScheduled } from '$lib/server/services/posts';
import { apiError, requireBearer } from '$lib/server/api';

export async function DELETE({ request, params }) {
	try {
		const { userId } = await requireBearer(request);
		return json(await cancelScheduled(userId, params.id));
	} catch (err) {
		return apiError(err);
	}
}
