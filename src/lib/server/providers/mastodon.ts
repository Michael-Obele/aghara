// Mastodon provider — per-instance OAuth token, POST /api/v1/statuses.
export const channel = 'mastodon';
export const maxLength = 500; // most instances default to 500 chars

export interface MastodonCreds {
	instanceUrl: string;
	accessToken: string;
}

function base(url: string): string {
	return url.replace(/\/+$/, '');
}

export async function verify(creds: MastodonCreds): Promise<void> {
	const res = await fetch(`${base(creds.instanceUrl)}/api/v1/accounts/verify_credentials`, {
		headers: { authorization: `Bearer ${creds.accessToken}` }
	});
	if (!res.ok) throw new Error(`Mastodon token rejected (${res.status})`);
}

export async function publish(
	input: { body: string; mediaUrls: string[] },
	creds: MastodonCreds
): Promise<{ url?: string }> {
	const res = await fetch(`${base(creds.instanceUrl)}/api/v1/statuses`, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${creds.accessToken}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({ status: input.body })
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Mastodon status failed (${res.status}): ${text.slice(0, 300)}`);
	}
	const data = (await res.json()) as { url?: string };
	return { url: data.url };
}
