// LinkedIn provider — 3-legged OAuth token, POST /rest/posts.
// Single post, no threads — multiple segments are joined into one commentary.
import { graphemes, resolveSegments } from './types';
import type { Platform } from './types';

export interface LinkedInCreds {
	accessToken: string;
	personUrn?: string;
}

const API = 'https://api.linkedin.com';

export const linkedin: Platform = {
	channel: 'linkedin',
	name: 'LinkedIn',
	maxLength: 3000,
	features: {
		threads: false,
		sequentialSplit: false,
		formatting: 'none',
		linkPreview: false,
		media: false,
		contentWarning: false,
		poll: false,
		idempotency: false
	},
	// Resolve the author URN from the token and store it in credentials.
	async verify(creds) {
		const { accessToken } = creds as unknown as LinkedInCreds;
		const res = await fetch(`${API}/v2/userinfo`, {
			headers: { authorization: `Bearer ${accessToken}` }
		});
		if (!res.ok) throw new Error(`LinkedIn token rejected (${res.status})`);
		const data = (await res.json()) as { sub?: string };
		if (!data.sub) throw new Error('LinkedIn userinfo returned no sub');
		return { personUrn: `urn:li:person:${data.sub}` };
	},
	async publish(input, creds) {
		const { accessToken, personUrn } = creds as unknown as LinkedInCreds;
		if (!personUrn) throw new Error('LinkedIn author URN missing — reconnect the account');

		const text = resolveSegments(input).join('\n\n');
		if (graphemes(text) > 3000) {
			throw new Error(
				'LinkedIn allows 3000 characters and cannot split into a thread — trim the post or add a thread-capable network.'
			);
		}

		const body: Record<string, unknown> = {
			author: personUrn,
			lifecycleState: 'PUBLISHED',
			visibility: 'PUBLIC',
			distribution: { feedDistribution: 'MAIN_FEED' },
			commentary: text,
			content: {
				media: {
					title: 'Aghara post',
					description: text.slice(0, 200)
				}
			}
		};

		const res = await fetch(`${API}/rest/posts`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${accessToken}`,
				'content-type': 'application/json',
				'linkedin-version': '202401'
			},
			body: JSON.stringify(body)
		});
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`LinkedIn post failed (${res.status}): ${text.slice(0, 300)}`);
		}
		const id = res.headers.get('x-restli-id');
		return { url: id ? `https://www.linkedin.com/feed/update/${id}` : undefined };
	}
};
