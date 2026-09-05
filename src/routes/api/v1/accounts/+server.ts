// GET/POST /api/v1/accounts — list / connect channel accounts (Bearer).
import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { ConnectAccountSchema } from '$lib/schemas/account';
import { listAccounts, connectAccount } from '$lib/server/services/accounts';
import { apiError, requireBearer } from '$lib/server/api';

export async function GET({ request }) {
	try {
		const { userId } = await requireBearer(request);
		return json(await listAccounts(userId));
	} catch (err) {
		return apiError(err);
	}
}

export async function POST({ request }) {
	try {
		const { userId } = await requireBearer(request);
		const body = await request.json();
		const input = v.parse(ConnectAccountSchema, body);
		const result = await connectAccount(userId, input);
		return json(result, { status: 201 });
	} catch (err) {
		return apiError(err);
	}
}
