// DELETE /api/v1/scheduled/[id] — cancel a queued post, or hard-delete a
// finished one (?hard=true for posted/failed/canceled) (Bearer).
// PATCH  /api/v1/scheduled/[id] — edit an unsent post (queued/failed) (Bearer).
import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { UpdatePostSchema } from '$lib/schemas/post';
import { cancelScheduled, updateScheduled } from '$lib/server/services/posts';
import { deleteScheduled } from '$lib/server/services/retention';
import { AppError } from '$lib/server/services/errors';
import { apiError, requireBearer } from '$lib/server/api';

export async function DELETE({ request, params, url }) {
	try {
		const { userId } = await requireBearer(request);
		if (url.searchParams.get('hard') === 'true') {
			const result = await deleteScheduled(userId, params.id);
			if (result.deleted === 0) {
				throw new AppError(
					'NOT_DELETABLE',
					'Only posted, failed, or canceled posts can be deleted',
					409
				);
			}
			return json(result);
		}
		return json(await cancelScheduled(userId, params.id));
	} catch (err) {
		return apiError(err);
	}
}

export async function PATCH({ request, params }) {
	try {
		const { userId } = await requireBearer(request);
		const body = await request.json();
		const input = v.parse(UpdatePostSchema, { ...body, scheduledId: params.id });
		return json(await updateScheduled(userId, input));
	} catch (err) {
		return apiError(err);
	}
}
