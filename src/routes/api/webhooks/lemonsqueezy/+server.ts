// POST /api/webhooks/lemonsqueezy — subscription sync (X-Signature HMAC-SHA256).
// Read the RAW body first — hashing must happen before any JSON parsing.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { syncLemonSubscription } from '$lib/server/services/billing';

export async function POST({ request }) {
	const rawBody = await request.text();

	const secret = env.LEMON_WEBHOOK_SECRET;
	if (!secret) {
		return new Response('webhook not configured', { status: 503 });
	}

	const digest = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8');
	const signature = Buffer.from(request.headers.get('x-signature') ?? '', 'utf8');
	if (signature.length !== digest.length || !timingSafeEqual(digest, signature)) {
		return new Response('bad signature', { status: 401 });
	}

	try {
		const payload = JSON.parse(rawBody) as {
			name?: string;
			data?: Record<string, unknown>;
			meta?: { custom_data?: { user_id?: string } };
		};
		await syncLemonSubscription(payload);
		return new Response('ok', { status: 200 });
	} catch (err) {
		console.error('[aghara] lemon webhook error:', err);
		return new Response('error', { status: 500 });
	}
}
