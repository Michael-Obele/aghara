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
	return connectAccount(userId, data);
});

export const disconnectAccountCommand = command(
	'unchecked',
	async ({ accountId }: { accountId: string }) => {
		const userId = requireUserId();
		return disconnectAccount(userId, accountId);
	}
);
