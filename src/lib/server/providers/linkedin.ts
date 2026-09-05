// LinkedIn provider — 3-legged OAuth token, POST /rest/posts.
export const channel = 'linkedin';
export const maxLength = 3000;

export interface LinkedInCreds {
	accessToken: string;
	personUrn?: string;
}

const API = 'https://api.linkedin.com';

/** Resolve the author URN from the token and store it in credentials. */
export async function verify(creds: LinkedInCreds): Promise<Partial<LinkedInCreds>> {
	const res = await fetch(`${API}/v2/userinfo`, {
		headers: { authorization: `Bearer ${creds.accessToken}` }
	});
	if (!res.ok) throw new Error(`LinkedIn token rejected (${res.status})`);
	const data = (await res.json()) as { sub?: string };
	if (!data.sub) throw new Error('LinkedIn userinfo returned no sub');
	return { personUrn: `urn:li:person:${data.sub}` };
}

export async function publish(
	input: { body: string; mediaUrls: string[] },
	creds: LinkedInCreds
): Promise<{ url?: string }> {
	if (!creds.personUrn) throw new Error('LinkedIn author URN missing — reconnect the account');

	const body: Record<string, unknown> = {
		author: creds.personUrn,
		lifecycleState: 'PUBLISHED',
		visibility: 'PUBLIC',
		distribution: { feedDistribution: 'MAIN_FEED' },
		commentary: input.body,
		content: {
			media: {
				title: 'Aghara post',
				description: input.body.slice(0, 200)
			}
		}
	};

	const res = await fetch(`${API}/rest/posts`, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${creds.accessToken}`,
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
