// Better Auth mount — forwards all /api/auth/* requests to the auth handler.
import { auth } from '$lib/server/auth';
import { toSvelteKitHandler } from 'better-auth/svelte-kit';
import type { RequestHandler } from './$types';

const handler = toSvelteKitHandler(auth);

export const GET: RequestHandler = ({ request }) => handler({ request });
export const POST: RequestHandler = ({ request }) => handler({ request });
