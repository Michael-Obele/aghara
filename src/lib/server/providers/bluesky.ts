// Bluesky provider — core channel (M1).
// @atproto/api BskyAgent, login per publish with handle + app-password.
import { AppBskyEmbedImages, BskyAgent } from '@atproto/api';

export const channel = 'bluesky';
export const maxLength = 300; // graphemes, not UTF-16 code units

export interface BlueskyCreds {
	handle: string;
	appPassword: string;
}

/** Count graphemes (user-perceived characters) via Intl.Segmenter. */
export function countGraphemes(text: string): number {
	try {
		const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
		return [...segmenter.segment(text)].length;
	} catch {
		return [...text].length;
	}
}

export async function verify(creds: BlueskyCreds): Promise<void> {
	const agent = new BskyAgent({ service: 'https://bsky.social' });
	try {
		await agent.login({ identifier: creds.handle, password: creds.appPassword });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`Bluesky login failed: ${msg}`);
	}
}

export async function publish(
	input: { body: string; mediaUrls: string[] },
	creds: BlueskyCreds
): Promise<{ url?: string }> {
	const agent = new BskyAgent({ service: 'https://bsky.social' });
	await agent.login({ identifier: creds.handle, password: creds.appPassword });

	let embed: { $type: 'app.bsky.embed.images'; images: AppBskyEmbedImages.Image[] } | undefined;

	// M5: attach media blobs when provided (max 4 images).
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
		embed = {
			$type: 'app.bsky.embed.images',
			images
		};
	}

	const res = await agent.post({ text: input.body, ...(embed ? { embed } : {}) });
	const rkey = res.uri.split('/').pop();
	return { url: `https://bsky.app/profile/${creds.handle}/post/${rkey}` };
}
