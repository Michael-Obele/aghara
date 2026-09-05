// DELETE /api/v1/tokens/[id] — revoke a token (session or Bearer).
import { json } from '@sveltejs/kit';
import { revokeToken } from '$lib/server/services/tokens';
import { apiError, requireUser } from '$lib/server/api';

export async function DELETE(event) {
	try {
		const { userId } = await requireUser(event);
		return json(await revokeToken(userId, event.params.id));
	} catch (err) {
		return apiError(err);
	}
}
