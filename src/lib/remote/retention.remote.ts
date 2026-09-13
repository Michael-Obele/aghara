// Remote functions for retention (pages only — no HTTP to /api/v1).
import { query, command } from '$app/server';
import * as v from 'valibot';
import { DeleteScheduledSchema } from '$lib/schemas/post';
import {
	getRetention,
	setRetention,
	deleteScheduled,
	clearHistory
} from '$lib/server/services/retention';
import { AppError } from '$lib/server/services/errors';
import { requireUserId } from '$lib/server/session';

export const retentionQuery = query(async () => {
	const userId = requireUserId();
	return getRetention(userId);
});

export const setRetentionCommand = command(
	v.object({ retainHistory: v.boolean() }),
	async (data) => {
		const userId = requireUserId();
		return setRetention(userId, data.retainHistory);
	}
);

export const deleteScheduledCommand = command(DeleteScheduledSchema, async (data) => {
	const userId = requireUserId();
	const result = await deleteScheduled(userId, data.scheduledId);
	if (result.deleted === 0) {
		throw new AppError(
			'NOT_DELETABLE',
			'Only posted, failed, or canceled posts can be deleted',
			409
		);
	}
	return result;
});

export const clearHistoryCommand = command(
	'unchecked',
	async (_input: Record<string, never> = {}) => {
		const userId = requireUserId();
		return clearHistory(userId);
	}
);
