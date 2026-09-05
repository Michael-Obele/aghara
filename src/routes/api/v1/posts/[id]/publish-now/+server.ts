// POST /api/v1/posts/[id]/publish-now — publish immediately (Bearer).
import { json } from '@sveltejs/kit';
import { publishNow } from '$lib/server/services/posts';
import { apiError, requireBearer } from '$lib/server/api';

export async function POST({ request, params }) {
	try {
		const { userId } = await requireBearer(request);
		return json(await publishNow(userId, params.id));
	} catch (err) {
		return apiError(err);
	}
}
