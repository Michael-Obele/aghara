// Billing — plan limits + Paystack checkout/webhook sync.
// SELF_HOST=true disables all billing checks and hides billing UI.
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { channelAccounts, posts, scheduledPosts, subscriptions, user } from '$lib/server/db/schema';
import { AppError } from './errors';

// Paystack plan codes — NGN primary, USD optional (set PAYSTACK_PLAN_*_USD to enable USD).
const PAYSTACK_PLANS: Record<string, string | undefined> = {
	'creator:NGN': env.PAYSTACK_PLAN_CREATOR,
	'creator:USD': env.PAYSTACK_PLAN_CREATOR_USD,
	'pro:NGN': env.PAYSTACK_PLAN_PRO,
	'pro:USD': env.PAYSTACK_PLAN_PRO_USD,
	'creator_yearly:NGN': env.PAYSTACK_PLAN_CREATOR_YEARLY,
	'creator_yearly:USD': env.PAYSTACK_PLAN_CREATOR_YEARLY_USD,
	'pro_yearly:NGN': env.PAYSTACK_PLAN_PRO_YEARLY,
	'pro_yearly:USD': env.PAYSTACK_PLAN_PRO_YEARLY_USD
};

function paystackPlanCode(plan: 'creator' | 'pro', currency: 'NGN' | 'USD'): string | undefined {
	return PAYSTACK_PLANS[`${plan}:${currency}`];
}

function planFromPaystackCode(code: string): 'creator' | 'pro' | null {
	for (const [key, val] of Object.entries(PAYSTACK_PLANS)) {
		if (val && val === code) {
			if (key.startsWith('creator')) return 'creator';
			if (key.startsWith('pro')) return 'pro';
		}
	}
	return null;
}

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

/** Create a Paystack hosted checkout URL for a plan variant. */
export async function startCheckout(
	userId: string,
	email: string,
	variant: 'creator' | 'pro',
	opts?: { currency?: 'NGN' | 'USD' }
): Promise<string> {
	if (isSelfHost()) {
		throw new AppError('BILLING_DISABLED', 'Billing is disabled in self-host mode.', 400);
	}
	const currency = opts?.currency ?? 'NGN';
	const secret = env.PAYSTACK_SECRET_KEY;
	if (!secret) throw new AppError('BILLING_NOT_CONFIGURED', 'Paystack is not configured yet.', 503);
	const planCode = paystackPlanCode(variant, currency);
	if (!planCode) {
		throw new AppError(
			'BILLING_NOT_CONFIGURED',
			`No Paystack plan configured for ${variant} (${currency}).`,
			503
		);
	}
	const res = await fetch('https://api.paystack.co/transaction/initialize', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${secret}`,
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			email,
			plan: planCode,
			currency,
			callback_url: `${env.ORIGIN}/billing/success`,
			metadata: { user_id: userId, plan: variant, currency }
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new AppError('CHECKOUT_FAILED', `Paystack checkout failed: ${text.slice(0, 300)}`, 502);
	}
	const data = (await res.json()) as { status?: boolean; data?: { authorization_url?: string } };
	const url = data.data?.authorization_url;
	if (!url) throw new AppError('CHECKOUT_FAILED', 'Paystack returned no checkout URL', 502);
	return url;
}

/**
 * Paystack webhook → subscriptions upsert. Handles charge.success (first
 * payment creates subscription), subscription.create/disable, invoice events.
 */
export async function syncPaystackSubscription(payload: {
	event?: string;
	data?: Record<string, unknown>;
}): Promise<void> {
	const event = payload.event ?? '';
	const data = (payload.data ?? {}) as Record<string, unknown>;
	const isChargeSuccess = event === 'charge.success';
	const isSubscriptionEvent = event.startsWith('subscription.');
	const isInvoiceEvent = event.startsWith('invoice.');
	if (!isChargeSuccess && !isSubscriptionEvent && !isInvoiceEvent) return;

	const planCode =
		(data.plan as { plan_code?: string } | undefined)?.plan_code ??
		(data.plan_code as string | undefined) ??
		'';
	const customerCode =
		(data.customer as { customer_code?: string } | undefined)?.customer_code ?? '';
	const customerEmail = (data.customer as { email?: string } | undefined)?.email ?? '';
	const subscriptionCode = (data.subscription_code as string | undefined) ?? '';
	const emailToken = (data.email_token as string | undefined) ?? '';
	const nextPaymentDate = data.next_payment_date ? new Date(String(data.next_payment_date)) : null;

	const metadata = (data.metadata as Record<string, unknown> | undefined) ?? {};
	const customUserId = String(metadata.user_id ?? '');
	let userId = customUserId;
	if (!userId && customerEmail) {
		const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, customerEmail));
		userId = u?.id;
	}
	if (!userId) return;

	let active = true;
	let plan: 'creator' | 'pro' | null = planCode ? planFromPaystackCode(planCode) : null;

	if (event === 'subscription.disable' || event === 'subscription.not_renewing') {
		active = false;
	} else if (event === 'invoice.failed') {
		return;
	}
	if (!plan && isChargeSuccess) {
		const [existing] = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.userId, userId));
		plan = (existing?.plan as 'creator' | 'pro' | null) ?? null;
		if (!plan) return;
	}
	if (!plan) return;

	const newPlan = active ? plan : 'free';

	await db
		.insert(subscriptions)
		.values({
			userId,
			plan: newPlan,
			paystackCustomerCode: customerCode || null,
			paystackSubscriptionCode: subscriptionCode || null,
			paystackEmailToken: emailToken || null,
			provider: 'paystack',
			status: active ? 'active' : 'inactive',
			currentPeriodEnd: nextPaymentDate
		})
		.onConflictDoUpdate({
			target: subscriptions.userId,
			set: {
				plan: newPlan,
				paystackCustomerCode: customerCode || null,
				paystackSubscriptionCode: subscriptionCode || null,
				paystackEmailToken: emailToken || null,
				provider: 'paystack',
				status: active ? 'active' : 'inactive',
				currentPeriodEnd: nextPaymentDate
			}
		});
}
