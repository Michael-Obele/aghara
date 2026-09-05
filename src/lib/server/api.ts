// Shared REST helpers — bearer/session auth + error → JSON mapping.
import { json, type RequestEvent } from '@sveltejs/kit';
import * as v from 'valibot';
import { AppError, Errors } from './services/errors';
import { findUserByToken } from './services/tokens';

/** Require a valid Bearer token. Throws 401 otherwise. */
export async function requireBearer(request: Request): Promise<{ userId: string }> {
	const header = request.headers.get('authorization') ?? '';
	const match = /^Bearer\s+(.+)$/i.exec(header);
	if (!match) throw Errors.unauthorized('Missing bearer token');
	const found = await findUserByToken(match[1].trim());
	if (!found) throw Errors.unauthorized('Invalid or revoked token');
	return { userId: found.userId };
}

/** Require either a session (web) or a Bearer token (machines). */
export async function requireUser(event: RequestEvent): Promise<{ userId: string }> {
	const header = event.request.headers.get('authorization');
	if (header?.startsWith('Bearer ')) {
		const found = await findUserByToken(header.slice('Bearer '.length).trim());
		if (!found) throw Errors.unauthorized('Invalid or revoked token');
		return { userId: found.userId };
	}
	if (event.locals.user) return { userId: event.locals.user.id };
	throw Errors.unauthorized('Sign in required');
}

/** Map any thrown error to the standard { error, message } JSON shape. */
export function apiError(err: unknown): Response {
	if (err instanceof AppError) {
		return json({ error: err.code, message: err.message }, { status: err.status });
	}
	if (err instanceof v.ValiError) {
		return json(
			{
				error: 'VALIDATION_ERROR',
				message: 'Invalid input: ' + err.issues.map((i) => i.message).join('; ')
			},
			{ status: 400 }
		);
	}
	console.error('[aghara] unhandled API error:', err);
	return json({ error: 'INTERNAL', message: 'Internal server error' }, { status: 500 });
}
