// Server-only session helpers for remote functions.
import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import type { User } from 'better-auth';

export function requireUser(): User {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user) throw error(401, 'Sign in required');
	return user;
}

export function requireUserId(): string {
	return requireUser().id;
}
