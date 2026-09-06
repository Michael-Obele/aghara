// Shared platform contract — ONE file that houses the generic types, capability
// flags and thread/split helpers every provider uses. Each platform lives in its
// own file and implements this contract, so we can see and extend one platform at
// a time without touching the others.
//
// The capability matrix (features) is the single source of truth that drives both
// the compose UI (limits, thread/split hints) and what Aghara enables at publish.

export type Formatting = 'markdown' | 'html' | 'none';

export interface PlatformFeatures {
	/** Can chain posts into a real reply-thread (Bluesky, Mastodon, Threads). */
	threads: boolean;
	/** Splits long text into multiple standalone messages (Telegram, Discord). */
	sequentialSplit: boolean;
	/** Can render rich text via an official markup mode. */
	formatting: Formatting;
	/** Can control link previews on published content. */
	linkPreview: boolean;
	/** Supports attaching images. */
	media: boolean;
	/** Supports content-warning / spoiler. */
	contentWarning: boolean;
	/** Supports polls. */
	poll: boolean;
	/** Supports idempotency keys for safe retries. */
	idempotency: boolean;
}

export interface PublishInput {
	/** Canonical full text (all segments joined) — for display + single-post platforms. */
	body: string;
	/** Explicit thread segments. If omitted/empty the body is auto-split to fit. */
	segments?: string[];
	mediaUrls: string[];
}

export interface PublishResult {
	/** Primary (first) post URL. */
	url?: string;
	/** One URL per segment, when the platform exposes them (thread platforms). */
	postedUrls?: string[];
}

export interface Platform {
	channel: string;
	name: string;
	/** Per-segment character limit. */
	maxLength: number;
	features: PlatformFeatures;
	verify: (creds: Record<string, unknown>) => Promise<void | Partial<Record<string, unknown>>>;
	publish: (input: PublishInput, creds: Record<string, unknown>) => Promise<PublishResult>;
}

/** Serializable capability summary — safe to send to the client. */
export interface PlatformInfo {
	channel: string;
	name: string;
	maxLength: number;
	features: PlatformFeatures;
}

/** Count graphemes (user-perceived characters) via Intl.Segmenter. */
export function graphemes(text: string): number {
	try {
		const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
		return [...segmenter.segment(text)].length;
	} catch {
		return [...text].length;
	}
}

/** Resolve the effective segments: explicit non-empty segments, else the whole body. */
export function resolveSegments(input: Pick<PublishInput, 'body' | 'segments'>): string[] {
	const segs = (input.segments ?? []).map((s) => s.trim()).filter(Boolean);
	return segs.length > 0 ? segs : [input.body];
}

/**
 * Split text into grapheme-safe chunks <= maxLength, preferring paragraph and
 * sentence breaks so the thread reads naturally. Used by thread-capable platforms
 * (auto-split fallback) and by sequential-split platforms (Telegram/Discord).
 */
export function splitText(text: string, maxLength: number): string[] {
	const cleaned = text.replace(/\r\n/g, '\n').trim();
	if (graphemes(cleaned) <= maxLength) return [cleaned];
	const chunks: string[] = [];
	let rest = cleaned;
	while (graphemes(rest) > maxLength) {
		const cut = findBreak(rest, maxLength);
		const part = rest.slice(0, cut).trim();
		if (part) chunks.push(part);
		rest = rest.slice(cut).trim();
	}
	if (rest) chunks.push(rest);
	return chunks.filter(Boolean);
}

function findBreak(text: string, max: number): number {
	const para = text.lastIndexOf('\n\n', max);
	if (para > 0) return para;
	const nl = text.lastIndexOf('\n', max);
	if (nl > 0) return nl;
	// Sentence boundaries — keep the trailing punctuation.
	for (const p of ['. ', '! ', '? ']) {
		const i = text.lastIndexOf(p, max);
		if (i > 0) return i + 1;
	}
	const sp = text.lastIndexOf(' ', max);
	if (sp > 0) return sp;
	// Hard fallback — never split a surrogate pair.
	return text.charCodeAt(max - 1) >= 0xd800 && text.charCodeAt(max - 1) <= 0xdbff ? max - 1 : max;
}
