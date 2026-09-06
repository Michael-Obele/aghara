// Remote functions for posts (pages only — no HTTP to /api/v1).
import { query, form, command } from '$app/server';
import { CreatePostSchema, PublishNowSchema, CancelSchema, RetrySchema } from '$lib/schemas/post';
import {
	createPost,
	listScheduled,
	publishNow,
	cancelScheduled,
	retryScheduled
} from '$lib/server/services/posts';
import { AppError } from '$lib/server/services/errors';
import { requireUserId } from '$lib/server/session';

export const listScheduledQuery = query(
	'unchecked',
	async ({ status }: { status?: string } = {}) => {
		const userId = requireUserId();
		return listScheduled(userId, status);
	}
);

export const createPostForm = form(CreatePostSchema, async (data) => {
	const userId = requireUserId();
	try {
		await createPost(userId, data);
		return { ok: true as const };
	} catch (err) {
		if (err instanceof AppError) {
			return { ok: false as const, message: err.message };
		}
		throw err;
	}
});

export const publishNowCommand = command(PublishNowSchema, async (data) => {
	const userId = requireUserId();
	return publishNow(userId, data.scheduledId);
});

export const cancelScheduledCommand = command(CancelSchema, async (data) => {
	const userId = requireUserId();
	return cancelScheduled(userId, data.scheduledId);
});

export const retryScheduledCommand = command(RetrySchema, async (data) => {
	const userId = requireUserId();
	return retryScheduled(userId, data.scheduledId, data.runAt);
});
