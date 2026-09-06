// Threads provider — Meta OAuth, container → publish two-step.
// Threads via reply_to_id: each follow-up replies to the previous published post.
// API is free but requires Meta app review. Gated behind THREADS_ENABLED.
import { env } from '$env/dynamic/private';
import { resolveSegments, splitText } from './types';
import type { Platform } from './types';

export interface ThreadsCreds {
	accessToken: string;
	userId: string;
}

const API = 'https://graph.threads.net';

export const threads: Platform = {
	channel: 'threads',
	name: 'Threads',
	maxLength: 500,
	features: {
		threads: true,
		sequentialSplit: false,
		formatting: 'none',
		linkPreview: false,
		media: true,
		contentWarning: false,
		poll: false,
		idempotency: false
	},
	async verify(creds) {
		const { accessToken, userId } = creds as unknown as ThreadsCreds;
		const res = await fetch(`${API}/v1.0/${userId}?fields=id,username&access_token=${accessToken}`);
		if (!res.ok) throw new Error(`Threads token rejected (${res.status})`);
	},
	async publish(input, creds) {
		if (env.THREADS_ENABLED !== 'true') {
			throw new Error(
				'THREADS_NOT_APPROVED: Threads API requires Meta app review. Set THREADS_ENABLED=true once approved.'
			);
		}
		const { accessToken, userId } = creds as unknown as ThreadsCreds;
		const segs = resolveSegments(input).flatMap((s) => splitText(s, 500));
		const postedUrls: string[] = [];
		let replyToId: string | undefined;

		for (const seg of segs) {
			// Step 1: create a text container (reply_to_id chains the thread).
			const containerRes = await fetch(
				`${API}/v1.0/${userId}/threads?media_type=TEXT&text=${encodeURIComponent(seg)}&access_token=${accessToken}${replyToId ? `&reply_to_id=${replyToId}` : ''}`,
				{ method: 'POST' }
			);
			if (!containerRes.ok) {
				const text = await containerRes.text();
				throw new Error(`Threads container failed (${containerRes.status}): ${text.slice(0, 300)}`);
			}
			const { id: containerId } = (await containerRes.json()) as { id: string };

			// Step 2: publish the container.
			const pubRes = await fetch(
				`${API}/v1.0/${userId}/threads_publish?creation_id=${containerId}&access_token=${accessToken}`,
				{ method: 'POST' }
			);
			if (!pubRes.ok) {
				const text = await pubRes.text();
				throw new Error(`Threads publish failed (${pubRes.status}): ${text.slice(0, 300)}`);
			}
			const { id } = (await pubRes.json()) as { id: string };
			replyToId = id;
			postedUrls.push(`https://www.threads.net/@${userId}/post/${id}`);
		}

		return { url: postedUrls[0], postedUrls };
	}
};
