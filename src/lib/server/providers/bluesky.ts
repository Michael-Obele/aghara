// Bluesky provider — core channel. Threads via reply-chaining: the first post is
// the root, every follow-up is a reply to the previous post (root = first, parent = previous).
import { AppBskyEmbedImages, BskyAgent } from '@atproto/api';
import { resolveSegments, splitText } from './types';
import type { Platform } from './types';

const SERVICE = 'https://bsky.social';

export interface BlueskyCreds {
	handle: string;
	appPassword: string;
}

export const bluesky: Platform = {
	channel: 'bluesky',
	name: 'Bluesky',
	maxLength: 300, // graphemes, not UTF-16 code units
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
		const { handle, appPassword } = creds as unknown as BlueskyCreds;
		const agent = new BskyAgent({ service: SERVICE });
		try {
			await agent.login({ identifier: handle, password: appPassword });
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			throw new Error(`Bluesky login failed: ${msg}`);
		}
	},
	async publish(input, creds) {
		const { handle } = creds as unknown as BlueskyCreds;
		const agent = new BskyAgent({ service: SERVICE });
		await agent.login({
			identifier: handle,
			password: (creds as unknown as BlueskyCreds).appPassword
		});

		// Explicit segments, else auto-split the body to fit 300 graphemes per post.
		const segs = resolveSegments(input).flatMap((s) => splitText(s, 300));

		let embed: { $type: 'app.bsky.embed.images'; images: AppBskyEmbedImages.Image[] } | undefined;
		if (input.mediaUrls.length > 0) {
			const images: AppBskyEmbedImages.Image[] = [];
			for (const url of input.mediaUrls.slice(0, 4)) {
				const res = await fetch(url);
				if (!res.ok) throw new Error(`Failed to fetch media: ${url} (${res.status})`);
				const blob = await res.blob();
				const uploaded = await agent.uploadBlob(blob, {
					encoding: res.headers.get('content-type') ?? 'image/jpeg'
				});
				images.push({ alt: '', image: uploaded.data.blob });
			}
			embed = { $type: 'app.bsky.embed.images', images };
		}

		const postedUrls: string[] = [];
		let root: { uri: string; cid: string } | undefined;
		let parent: { uri: string; cid: string } | undefined;

		for (let i = 0; i < segs.length; i++) {
			const isFirst = i === 0;
			const res = await agent.post({
				text: segs[i],
				...(embed && isFirst ? { embed } : {}),
				...(root && parent ? { reply: { root, parent } } : {})
			});
			const rkey = res.uri.split('/').pop() ?? '';
			const url = `https://bsky.app/profile/${handle}/post/${rkey}`;
			postedUrls.push(url);
			if (isFirst) {
				root = { uri: res.uri, cid: res.cid };
				parent = { uri: res.uri, cid: res.cid };
			} else {
				parent = { uri: res.uri, cid: res.cid };
			}
		}

		return { url: postedUrls[0], postedUrls };
	}
};
