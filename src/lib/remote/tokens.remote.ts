// Remote functions for API tokens (pages only).
import { query, command } from '$app/server';
import { CreateTokenSchema } from '$lib/schemas/token';
import { createToken, listTokens, revokeToken } from '$lib/server/services/tokens';
import { requireUserId } from '$lib/server/session';

export const listTokensQuery = query(async () => {
	const userId = requireUserId();
	return listTokens(userId);
});

export const createTokenCommand = command(CreateTokenSchema, async (data) => {
	const userId = requireUserId();
	return createToken(userId, data.name);
});

export const revokeTokenCommand = command('unchecked', async ({ tokenId }: { tokenId: string }) => {
	const userId = requireUserId();
	return revokeToken(userId, tokenId);
});
