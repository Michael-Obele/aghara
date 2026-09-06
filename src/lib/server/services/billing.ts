// Billing — plan limits + Lemon Squeezy checkout/webhook sync.
// SELF_HOST=true disables all billing checks and hides billing UI.
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { channelAccounts, posts, scheduledPosts, subscriptions, user } from '$lib/server/db/schema';
import { AppError } from './errors';

// No free tier: every hosted user must hold an active paid subscription.
// A user with no active subscription has plan === null and is gated to /billing.
export const PLANS = {
	creator: { accounts: 5, scheduledPerMonth: 500, tokens: true },
	pro: { accounts: Number.POSITIVE_INFINITY, scheduledPerMonth: 2000, tokens: true }
} as const;

export type Plan = 'creator' | 'pro' | 'self-host';

export function isSelfHost(): boolean {
	return env.SELF_HOST === 'true';
}

/** True when the user has role=admin (set via `bun run seed:admin`). */
async function isAdmin(userId: string): Promise<boolean> {
	const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
	return row?.role === 'admin';
}

export async function getPlan(
	userId: string
): Promise<{ plan: Plan | null; limits: (typeof PLANS)[keyof typeof PLANS] | null }> {
	if (isSelfHost()) {
		return { plan: 'self-host', limits: null };
	}
	// Admin is always pro — no expiry, bypasses plan limits.
	if (await isAdmin(userId)) {
		return { plan: 'pro', limits: PLANS.pro };
	}
	const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
	const active = row && row.status === 'active';
	const plan: Plan | null =
		active && (row.plan === 'creator' || row.plan === 'pro') ? row.plan : null;
	return { plan, limits: plan ? PLANS[plan] : null };
}

/** Throws PLAN_REQUIRED / LIMIT_EXCEEDED / TOKENS_NOT_INCLUDED when the user is over quota. */
export async function checkLimit(
	userId: string,
	kind: 'accounts' | 'scheduled' | 'tokens'
): Promise<void> {
	if (isSelfHost()) return;
	const { plan, limits } = await getPlan(userId);
	if (!plan || !limits) {
		throw new AppError(
			'PLAN_REQUIRED',
			'A paid plan is required to use Aghara. Choose a plan in Billing.',
			402
		);
	}

	if (kind === 'tokens' && !limits.tokens) {
		throw new AppError(
			'TOKENS_NOT_INCLUDED',
			'API tokens are included with the Creator and Pro plans.',
			403
		);
	}

	if (kind === 'accounts') {
		const [row] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(channelAccounts)
			.where(eq(channelAccounts.userId, userId));
		if ((row?.count ?? 0) >= limits.accounts) {
			throw new AppError(
				'LIMIT_EXCEEDED',
				`Your ${plan} plan allows ${limitLabel(limits.accounts)} channel account(s). Upgrade to add more.`,
				402
			);
		}
	}

	if (kind === 'scheduled') {
		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);
		const [row] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(scheduledPosts)
			.innerJoin(posts, eq(scheduledPosts.postId, posts.id))
			.where(
				and(
					eq(posts.userId, userId),
					gte(posts.createdAt, startOfMonth),
					inArray(scheduledPosts.status, ['queued', 'posted', 'failed'])
				)
			);
		if ((row?.count ?? 0) >= limits.scheduledPerMonth) {
			throw new AppError(
				'LIMIT_EXCEEDED',
				`Your ${plan} plan allows ${limits.scheduledPerMonth} scheduled posts per month. Upgrade for more.`,
				402
			);
		}
	}
}

function limitLabel(n: number): string {
	return Number.isFinite(n) ? String(n) : 'unlimited';
}

/** Create a Lemon Squeezy hosted checkout URL for a plan variant. */
export async function startCheckout(
	userId: string,
	email: string,
	variant: 'creator' | 'pro'
): Promise<string> {
	if (isSelfHost()) {
		throw new AppError('BILLING_DISABLED', 'Billing is disabled in self-host mode.', 400);
	}
	const apiKey = env.LEMON_API_KEY;
	const storeId = env.LEMON_STORE_ID;
	const variantId = variant === 'creator' ? env.LEMON_VARIANT_CREATOR : env.LEMON_VARIANT_PRO;
	if (!apiKey || !storeId || !variantId) {
		throw new AppError('BILLING_NOT_CONFIGURED', 'Billing is not configured yet.', 503);
	}

	const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${apiKey}`,
			accept: 'application/vnd.api+json',
			'content-type': 'application/vnd.api+json'
		},
		body: JSON.stringify({
			data: {
				type: 'checkouts',
				attributes: {
					product_options: {
						redirect_url: `${env.ORIGIN}/billing/success`
					},
					checkout_data: {
						email,
						custom: { user_id: userId }
					}
				},
				relationships: {
					store: { data: { type: 'stores', id: storeId } },
					variant: { data: { type: 'variants', id: variantId } }
				}
			}
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new AppError(
			'CHECKOUT_FAILED',
			`Lemon Squeezy checkout failed: ${text.slice(0, 200)}`,
			502
		);
	}
	const data = (await res.json()) as { data?: { attributes?: { url?: string } } };
	const url = data.data?.attributes?.url;
	if (!url) throw new AppError('CHECKOUT_FAILED', 'Lemon Squeezy returned no checkout URL', 502);
	return url;
}

/** Map a Lemon Squeezy variant id to our plan name. */
function planFromVariant(variantId: string | number): Plan | null {
	const id = String(variantId);
	if (env.LEMON_VARIANT_CREATOR && id === String(env.LEMON_VARIANT_CREATOR)) return 'creator';
	if (env.LEMON_VARIANT_PRO && id === String(env.LEMON_VARIANT_PRO)) return 'pro';
	return null;
}

/**
 * Lemon Squeezy webhook → subscriptions upsert. The webhook is the source of
 * truth for plan state. Handles subscription_created/updated/cancelled/expired.
 */
export async function syncLemonSubscription(payload: {
	name?: string;
	data?: Record<string, unknown>;
	meta?: { custom_data?: { user_id?: string } };
}): Promise<void> {
	const name = payload.name ?? '';
	if (!name.startsWith('subscription_')) return;

	const attrs = (payload.data ?? {}) as Record<string, unknown>;
	const customUserId = payload.meta?.custom_data?.user_id;
	const variantId = attrs.variant_id as string | number | undefined;
	const status = String(attrs.status ?? 'active');
	const customerEmail = String(attrs.user_email ?? attrs.customer_email ?? '');
	const lemonSubscriptionId = String(attrs.id ?? '');
	const lemonCustomerId = String(attrs.customer_id ?? '');
	const periodEnd = attrs.renews_at
		? new Date(String(attrs.renews_at))
		: attrs.ends_at
			? new Date(String(attrs.ends_at))
			: null;

	// Identify the user: custom user_id first, fall back to email.
	let userId = customUserId;
	if (!userId && customerEmail) {
		const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, customerEmail));
		userId = u?.id;
	}
	if (!userId) return; // unknown user — ignore

	const plan = planFromVariant(variantId ?? '');
	const active = status === 'active' || status === 'on_trial' || status === 'paused';
	// 'free' is the DB sentinel for "no paid plan" — getPlan() maps it to null (gated).
	const newPlan = plan && active ? plan : 'free';

	await db
		.insert(subscriptions)
		.values({
			userId,
			plan: newPlan,
			lemonCustomerId: lemonCustomerId || null,
			lemonSubscriptionId: lemonSubscriptionId || null,
			status: active ? 'active' : 'inactive',
			currentPeriodEnd: periodEnd
		})
		.onConflictDoUpdate({
			target: subscriptions.userId,
			set: {
				plan: newPlan,
				lemonCustomerId: lemonCustomerId || null,
				lemonSubscriptionId: lemonSubscriptionId || null,
				status: active ? 'active' : 'inactive',
				currentPeriodEnd: periodEnd
			}
		});
}
