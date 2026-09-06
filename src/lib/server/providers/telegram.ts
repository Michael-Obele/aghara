// Telegram provider — Bot API sendMessage. Free, unlimited.
// Long text splits into sequential messages (<=4096 each). We enable the full
// feature set the Bot API offers: link previews via link_preview_options
// (replaces the deprecated disable_web_page_preview), protect_content, and
// sequential splitting. parse_mode (HTML) is exposed as a capability for a
// future rich-text editor — it is intentionally left off by default so plain
// user text is never mangled by entity parsing.
import { resolveSegments, splitText } from './types';
import type { Platform } from './types';

export interface TelegramCreds {
	botToken: string;
	chatId: string;
}

export const telegram: Platform = {
	channel: 'telegram',
	name: 'Telegram',
	maxLength: 4096,
	features: {
		threads: false,
		sequentialSplit: true,
		formatting: 'html',
		linkPreview: true,
		media: false,
		contentWarning: false,
		poll: false,
		idempotency: false
	},
	async verify(creds) {
		const { botToken } = creds as unknown as TelegramCreds;
		const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
		if (!res.ok) {
			throw new Error(`Telegram bot token rejected (${res.status})`);
		}
	},
	async publish(input, creds) {
		const { botToken, chatId } = creds as unknown as TelegramCreds;
		const segs = resolveSegments(input).flatMap((s) => splitText(s, 4096));

		for (const seg of segs) {
			const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					chat_id: chatId,
					text: seg,
					// Enable link previews (is_disabled:false) instead of the deprecated flag.
					link_preview_options: { is_disabled: false },
					protect_content: false
				})
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(`Telegram sendMessage failed (${res.status}): ${text.slice(0, 300)}`);
			}
		}
		// Public channels get a link; private chats don't expose one.
		return {};
	}
};
