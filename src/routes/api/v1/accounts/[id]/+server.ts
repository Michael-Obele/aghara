// DELETE /api/v1/accounts/[id] — disconnect (Bearer).
import { json } from '@sveltejs/kit';
import { disconnectAccount } from '$lib/server/services/accounts';
import { apiError, requireBearer } from '$lib/server/api';

export async function DELETE({ request, params }) {
	try {
		const { userId } = await requireBearer(request);
		return json(await disconnectAccount(userId, params.id));
	} catch (err) {
		return apiError(err);
	}
}
