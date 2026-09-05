// Threads provider — Meta OAuth, container → publish two-step.
// API is free but requires Meta app review. Gated behind THREADS_ENABLED.
import { env } from '$env/dynamic/private';

export const channel = 'threads';
export const maxLength = 500;

export interface ThreadsCreds {
	accessToken: string;
	userId: string;
}

const API = 'https://graph.threads.net';

export async function verify(creds: ThreadsCreds): Promise<void> {
	const res = await fetch(
		`${API}/v1.0/${creds.userId}?fields=id,username&access_token=${creds.accessToken}`
	);
	if (!res.ok) throw new Error(`Threads token rejected (${res.status})`);
}

export async function publish(
	input: { body: string; mediaUrls: string[] },
	creds: ThreadsCreds
): Promise<{ url?: string }> {
	if (env.THREADS_ENABLED !== 'true') {
		throw new Error(
			'THREADS_NOT_APPROVED: Threads API requires Meta app review. Set THREADS_ENABLED=true once approved.'
		);
	}

	// Step 1: create a text container.
	const containerRes = await fetch(
		`${API}/v1.0/${creds.userId}/threads?media_type=TEXT&text=${encodeURIComponent(input.body)}&access_token=${creds.accessToken}`,
		{ method: 'POST' }
	);
	if (!containerRes.ok) {
		const text = await containerRes.text();
		throw new Error(`Threads container failed (${containerRes.status}): ${text.slice(0, 300)}`);
	}
	const { id: containerId } = (await containerRes.json()) as { id: string };

	// Step 2: publish the container.
	const pubRes = await fetch(
		`${API}/v1.0/${creds.userId}/threads_publish?creation_id=${containerId}&access_token=${creds.accessToken}`,
		{ method: 'POST' }
	);
	if (!pubRes.ok) {
		const text = await pubRes.text();
		throw new Error(`Threads publish failed (${pubRes.status}): ${text.slice(0, 300)}`);
	}
	const { id } = (await pubRes.json()) as { id: string };
	return { url: `https://www.threads.net/@${creds.userId}/post/${id}` };
}
