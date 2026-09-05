// GET/POST /api/v1/tokens — manage API tokens (session or Bearer).
import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { CreateTokenSchema } from '$lib/schemas/token';
import { createToken, listTokens } from '$lib/server/services/tokens';
import { apiError, requireUser } from '$lib/server/api';

export async function GET(event) {
	try {
		const { userId } = await requireUser(event);
		return json(await listTokens(userId));
	} catch (err) {
		return apiError(err);
	}
}

export async function POST(event) {
	try {
		const { userId } = await requireUser(event);
		const body = await event.request.json();
		const input = v.parse(CreateTokenSchema, body);
		const result = await createToken(userId, input.name);
		// The raw token is shown exactly once.
		return json({ id: result.id, name: result.name, token: result.raw }, { status: 201 });
	} catch (err) {
		return apiError(err);
	}
}
