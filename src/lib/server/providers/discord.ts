// Discord provider — webhook URL, no bot / OAuth needed. Free.
// Long text splits into sequential messages (<=2000 each). No thread concept.
import { resolveSegments, splitText } from './types';
import type { Platform } from './types';

export interface DiscordCreds {
	webhookUrl: string;
}

export const discord: Platform = {
	channel: 'discord',
	name: 'Discord',
	maxLength: 2000,
	features: {
		threads: false,
		sequentialSplit: true,
		formatting: 'none',
		linkPreview: false,
		media: false,
		contentWarning: false,
		poll: false,
		idempotency: false
	},
	async verify(creds) {
		const { webhookUrl } = creds as unknown as DiscordCreds;
		const res = await fetch(webhookUrl, { method: 'GET' });
		if (!res.ok) throw new Error(`Discord webhook invalid (${res.status})`);
	},
	async publish(input, creds) {
		const { webhookUrl } = creds as unknown as DiscordCreds;
		const segs = resolveSegments(input).flatMap((s) => splitText(s, 2000));
		for (const seg of segs) {
			const res = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ content: seg })
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(`Discord webhook failed (${res.status}): ${text.slice(0, 300)}`);
			}
		}
		return {};
	}
};
