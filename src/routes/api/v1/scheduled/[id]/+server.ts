// DELETE /api/v1/scheduled/[id] — cancel a queued post (Bearer).
// PATCH  /api/v1/scheduled/[id] — edit an unsent post (queued/failed) (Bearer).
import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { UpdatePostSchema } from '$lib/schemas/post';
import { cancelScheduled, updateScheduled } from '$lib/server/services/posts';
import { apiError, requireBearer } from '$lib/server/api';

export async function DELETE({ request, params }) {
	try {
		const { userId } = await requireBearer(request);
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
