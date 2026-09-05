// Discord provider — webhook URL, no bot / OAuth needed. Free.
export const channel = 'discord';
export const maxLength = 2000;

export interface DiscordCreds {
	webhookUrl: string;
}

function splitChunks(text: string, size: number): string[] {
	if (text.length <= size) return [text];
	const chunks: string[] = [];
	let rest = text;
	while (rest.length > size) {
		let cut = rest.lastIndexOf('\n', size);
		if (cut <= 0) cut = size;
		chunks.push(rest.slice(0, cut));
		rest = rest.slice(cut).trimStart();
	}
	if (rest) chunks.push(rest);
	return chunks;
}

export async function verify(creds: DiscordCreds): Promise<void> {
	const res = await fetch(creds.webhookUrl, { method: 'GET' });
	if (!res.ok) throw new Error(`Discord webhook invalid (${res.status})`);
}

export async function publish(
	input: { body: string; mediaUrls: string[] },
	creds: DiscordCreds
): Promise<{ url?: string }> {
	for (const chunk of splitChunks(input.body, maxLength)) {
		const res = await fetch(creds.webhookUrl, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ content: chunk })
		});
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Discord webhook failed (${res.status}): ${text.slice(0, 300)}`);
		}
	}
	return {};
}
