// POST /api/webhooks/paystack — Paystack subscription sync (x-paystack-signature HMAC-SHA512).
// Read the RAW body first — hashing must happen before any JSON parsing.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { syncPaystackSubscription } from '$lib/server/services/billing';

const PAYSTACK_IPS = new Set(['52.31.139.75', '52.49.173.169', '52.214.14.220']);

export async function POST({ request }) {
	const rawBody = await request.text();

	const secret = env.PAYSTACK_SECRET_KEY;
	if (!secret) {
		return new Response('webhook not configured', { status: 503 });
	}

	// Optional IP whitelist — log but don't block (proxies may obscure IP)
	const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	const ip = forwarded ?? request.headers.get('x-real-ip') ?? '';
	if (ip && !PAYSTACK_IPS.has(ip)) {
		console.warn(`[aghara] paystack webhook from unexpected IP: ${ip}`);
	}

	const signature = request.headers.get('x-paystack-signature') ?? '';
	if (!signature) {
		return new Response('missing signature', { status: 401 });
	}

	const digest = createHmac('sha512', secret).update(rawBody).digest('hex');
	// timingSafeEqual requires equal length buffers
	const sigBuf = Buffer.from(signature, 'utf8');
	const digBuf = Buffer.from(digest, 'utf8');
	if (sigBuf.length !== digBuf.length || !timingSafeEqual(sigBuf, digBuf)) {
		return new Response('bad signature', { status: 401 });
	}

	try {
		const payload = JSON.parse(rawBody) as { event?: string; data?: Record<string, unknown> };
		await syncPaystackSubscription(payload);
		return new Response('ok', { status: 200 });
	} catch (err) {
		console.error('[aghara] paystack webhook error:', err);
		return new Response('error', { status: 500 });
	}
}
