// Remote functions for auth — no +page.server.ts needed.
// The sveltekitCookies plugin sets session cookies via getRequestEvent, so
// signIn/signUp work from remote functions just like server actions.
import { query, form, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import { auth } from '$lib/server/auth';
import { SignInSchema, SignUpSchema } from '$lib/schemas/auth';
import { APIError } from 'better-auth/api';

export const currentUserQuery = query(async () => {
	const event = getRequestEvent();
	return event.locals.user ?? null;
});

export const signInForm = form(SignInSchema, async ({ email, password }) => {
	try {
		await auth.api.signInEmail({ body: { email, password } });
		return { ok: true as const };
	} catch (err) {
		if (err instanceof APIError) {
			return { ok: false as const, message: err.message || 'Sign-in failed' };
		}
		throw err;
	}
});

export const signUpForm = form(SignUpSchema, async ({ name, email, password }) => {
	try {
		await auth.api.signUpEmail({ body: { email, password, name } });
		return { ok: true as const };
	} catch (err) {
		if (err instanceof APIError) {
			return { ok: false as const, message: err.message || 'Registration failed' };
		}
		throw err;
	}
});

export const signOutCommand = command(async () => {
	const event = getRequestEvent();
	await auth.api.signOut({ headers: event.request.headers });
	return { ok: true };
});
