// GET /api/v1/settings/retention — read the retain-history toggle (Bearer).
// PUT /api/v1/settings/retention — set it: { retainHistory: boolean } (Bearer).
import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { getRetention, setRetention } from '$lib/server/services/retention';
import { apiError, requireBearer } from '$lib/server/api';

export async function GET({ request }) {
	try {
		const { userId } = await requireBearer(request);
		return json(await getRetention(userId));
	} catch (err) {
		return apiError(err);
	}
}

export async function PUT({ request }) {
	try {
		const { userId } = await requireBearer(request);
		const body = await request.json();
		const input = v.parse(v.object({ retainHistory: v.boolean() }), body);
		return json(await setRetention(userId, input.retainHistory));
	} catch (err) {
		return apiError(err);
	}
}
