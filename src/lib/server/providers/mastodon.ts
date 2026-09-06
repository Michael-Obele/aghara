// Mastodon provider — per-instance OAuth token, POST /api/v1/statuses.
// Threads via in_reply_to_id; supports idempotency keys for safe retries.
import { resolveSegments, splitText } from './types';
import type { Platform } from './types';

export interface MastodonCreds {
	instanceUrl: string;
	accessToken: string;
}

function base(url: string): string {
	return url.replace(/\/+$/, '');
}

export const mastodon: Platform = {
	channel: 'mastodon',
	name: 'Mastodon',
	maxLength: 500, // most instances default to 500 chars
	features: {
		threads: true,
		sequentialSplit: false,
		formatting: 'none',
		linkPreview: false,
		media: true,
		contentWarning: true,
		poll: true,
		idempotency: true
	},
	async verify(creds) {
		const { instanceUrl, accessToken } = creds as unknown as MastodonCreds;
		const res = await fetch(`${base(instanceUrl)}/api/v1/accounts/verify_credentials`, {
			headers: { authorization: `Bearer ${accessToken}` }
		});
		if (!res.ok) throw new Error(`Mastodon token rejected (${res.status})`);
	},
	async publish(input, creds) {
		const { instanceUrl, accessToken } = creds as unknown as MastodonCreds;
		const segs = resolveSegments(input).flatMap((s) => splitText(s, 500));
		const postedUrls: string[] = [];
		let inReplyToId: string | undefined;

		for (const seg of segs) {
			const res = await fetch(`${base(instanceUrl)}/api/v1/statuses`, {
				method: 'POST',
				headers: {
					authorization: `Bearer ${accessToken}`,
					'content-type': 'application/json',
					// Idempotency-Key prevents duplicate posts if a request is retried.
					'idempotency-key': crypto.randomUUID()
				},
				body: JSON.stringify({
					status: seg,
					...(inReplyToId ? { in_reply_to_id: inReplyToId } : {})
				})
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(`Mastodon status failed (${res.status}): ${text.slice(0, 300)}`);
			}
			const data = (await res.json()) as { id: string; url?: string };
			inReplyToId = data.id;
			if (data.url) postedUrls.push(data.url);
		}

		return { url: postedUrls[0], postedUrls };
	}
};
