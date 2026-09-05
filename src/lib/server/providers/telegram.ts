// Telegram provider — Bot API sendMessage. Free, unlimited.
export const channel = 'telegram';
export const maxLength = 4096;

export interface TelegramCreds {
	botToken: string;
	chatId: string;
}

export async function verify(creds: TelegramCreds): Promise<void> {
	const res = await fetch(`https://api.telegram.org/bot${creds.botToken}/getMe`);
	if (!res.ok) {
		throw new Error(`Telegram bot token rejected (${res.status})`);
	}
}

export async function publish(
	input: { body: string; mediaUrls: string[] },
	creds: TelegramCreds
): Promise<{ url?: string }> {
	const res = await fetch(`https://api.telegram.org/bot${creds.botToken}/sendMessage`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			chat_id: creds.chatId,
			text: input.body,
			disable_web_page_preview: false
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Telegram sendMessage failed (${res.status}): ${text.slice(0, 300)}`);
	}
	// Public channels get a link; private chats don't expose one.
	return {};
}
