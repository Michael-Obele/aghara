// Remote functions for channel accounts (pages only — no HTTP to /api/v1).
import { query, form, command } from '$app/server';
import { ConnectAccountSchema } from '$lib/schemas/account';
import { listAccounts, connectAccount, disconnectAccount } from '$lib/server/services/accounts';
import { requireUserId } from '$lib/server/session';

export const listAccountsQuery = query(async () => {
	const userId = requireUserId();
	return listAccounts(userId);
});

export const connectAccountForm = form(ConnectAccountSchema, async (data) => {
	const userId = requireUserId();
	try {
		await connectAccount(userId, data);
		return { ok: true as const };
	} catch (err) {
		// Surface expected failures (duplicate, plan limit, provider verify
		// rejections like a bad Bluesky password) as a form result instead of a
		// thrown 500, which production would mask to a generic message.
		return {
			ok: false as const,
			message: err instanceof Error ? err.message : 'Could not connect that account.'
		};
	}
});

export const disconnectAccountCommand = command(
	'unchecked',
	async ({ accountId }: { accountId: string }) => {
		const userId = requireUserId();
		return disconnectAccount(userId, accountId);
	}
);
