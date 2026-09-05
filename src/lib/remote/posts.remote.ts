// Remote functions for posts (pages only — no HTTP to /api/v1).
import { query, form, command } from '$app/server';
import { CreatePostSchema, PublishNowSchema, CancelSchema } from '$lib/schemas/post';
import { createPost, listScheduled, publishNow, cancelScheduled } from '$lib/server/services/posts';
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
	return createPost(userId, data);
});

export const publishNowCommand = command(PublishNowSchema, async (data) => {
	const userId = requireUserId();
	return publishNow(userId, data.scheduledId);
});

export const cancelScheduledCommand = command(CancelSchema, async (data) => {
	const userId = requireUserId();
	return cancelScheduled(userId, data.scheduledId);
});
