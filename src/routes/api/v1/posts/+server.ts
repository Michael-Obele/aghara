// GET/POST /api/v1/posts — list scheduled / create post + targets (Bearer).
import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { CreatePostSchema } from '$lib/schemas/post';
import { listScheduled, createPost } from '$lib/server/services/posts';
import { apiError, requireBearer } from '$lib/server/api';

export async function GET({ request, url }) {
	try {
		const { userId } = await requireBearer(request);
		const status = url.searchParams.get('status') ?? undefined;
		if (status && !['queued', 'posted', 'failed', 'canceled'].includes(status)) {
			return json({ error: 'VALIDATION_ERROR', message: 'Invalid status' }, { status: 400 });
		}
		return json(await listScheduled(userId, status));
	} catch (err) {
		return apiError(err);
	}
}

export async function POST({ request }) {
	try {
		const { userId } = await requireBearer(request);
		const body = await request.json();
		const input = v.parse(CreatePostSchema, body);
		const result = await createPost(userId, input);
		return json(result, { status: 201 });
	} catch (err) {
		return apiError(err);
	}
}
