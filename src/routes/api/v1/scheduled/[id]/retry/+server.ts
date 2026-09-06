// POST /api/v1/scheduled/[id]/retry — re-queue a failed post at a new time (Bearer).
import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { RetrySchema } from '$lib/schemas/post';
import { retryScheduled } from '$lib/server/services/posts';
import { apiError, requireBearer } from '$lib/server/api';

export async function POST({ request, params }) {
	try {
		const { userId } = await requireBearer(request);
		const body = await request.json();
		const input = v.parse(RetrySchema, { scheduledId: params.id, runAt: body.runAt });
		return json(await retryScheduled(userId, input.scheduledId, input.runAt));
	} catch (err) {
		return apiError(err);
	}
}
