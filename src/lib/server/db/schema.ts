import {
	pgTable,
	uuid,
	text,
	timestamp,
	integer,
	boolean,
	jsonb,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export * from './auth.schema';

// api_tokens — MCP / integration tokens. Store SHA-256 hash, show raw once.
export const apiTokens = pgTable('api_tokens', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	tokenHash: text('token_hash').notNull().unique(),
	scopes: jsonb('scopes').$type<string[]>().default(['posts:read', 'posts:write']),
	createdAt: timestamp('created_at').defaultNow(),
	lastUsedAt: timestamp('last_used_at'),
	revokedAt: timestamp('revoked_at')
});

// channel_accounts — one row per connected network account per user.
export const channelAccounts = pgTable(
	'channel_accounts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		channel: text('channel').notNull(), // bluesky|linkedin|threads|mastodon|telegram|discord
		label: text('label').notNull(), // e.g. "@me.bsky.social"
		credentials: text('credentials').notNull(), // AES-GCM encrypted JSON
		createdAt: timestamp('created_at').defaultNow()
	},
	(t) => [uniqueIndex('uq_account').on(t.userId, t.channel, t.label)]
);

// posts — the composed message (one per user intent).
// segments: explicit thread parts. Empty array => providers auto-split `body`
// into a thread (thread-capable platforms) or sequential messages (Telegram/Discord).
export const posts = pgTable('posts', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	body: text('body').notNull(),
	segments: jsonb('segments').$type<string[]>().default([]),
	mediaUrls: jsonb('media_urls').$type<string[]>().default([]),
	createdAt: timestamp('created_at').defaultNow()
});

// scheduled_posts — one row per (post × channel account). This is what cron polls.
export const scheduledPosts = pgTable(
	'scheduled_posts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		postId: uuid('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		channelAccountId: uuid('channel_account_id')
			.notNull()
			.references(() => channelAccounts.id, { onDelete: 'cascade' }),
		runAt: timestamp('run_at', { withTimezone: true }).notNull(),
		timezone: text('timezone').notNull().default('UTC'),
		status: text('status').notNull().default('queued'), // queued|posted|failed|canceled
		attempts: integer('attempts').notNull().default(0),
		lastError: text('last_error'),
		postedUrl: text('posted_url'),
		postedUrls: jsonb('posted_urls').$type<string[]>().default([]),
		postedAt: timestamp('posted_at', { withTimezone: true })
	},
	(t) => [index('ix_due').on(t.status, t.runAt)]
);

// user_settings — one row per user. Auto-delete is ON by default: finished
// posts (posted/failed/canceled) are pruned 7 days after they settle, keeping
// the DB lean. Users who want a permanent archive flip retainHistory on.
export const userSettings = pgTable('user_settings', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	retainHistory: boolean('retain_history').notNull().default(false),
	updatedAt: timestamp('updated_at').defaultNow()
});

// subscriptions — Paystack webhook is source of truth; webhook upserts here.
export const subscriptions = pgTable('subscriptions', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	plan: text('plan').notNull().default('free'), // creator|pro|free(=no plan sentinel)
	paystackCustomerCode: text('paystack_customer_code'),
	paystackSubscriptionCode: text('paystack_subscription_code'),
	paystackEmailToken: text('paystack_email_token'),
	provider: text('provider').notNull().default('paystack'),
	status: text('status').notNull().default('active'),
	currentPeriodEnd: timestamp('current_period_end', { withTimezone: true })
});

// health_probes — the status page's shared history, written by the server's own
// probe stream (never by a visitor), so every visitor sees the same window.
// Raw rows are kept RAW_RETENTION_DAYS; older hours survive as rollups, which
// keeps years of record in a few hundred rows.
export const healthProbes = pgTable(
	'health_probes',
	{
		checkedAt: timestamp('checked_at', { withTimezone: true }).primaryKey(),
		ok: boolean('ok').notNull(),
		latencyMs: integer('latency_ms').notNull(),
		statusCode: integer('status_code')
	},
	(t) => [index('ix_probe_time').on(t.checkedAt)]
);

// health_probe_hours — one row per hour, forever. This is the uptime record:
// how many probes succeeded, and the latency spread, without keeping every sample.
export const healthProbeHours = pgTable('health_probe_hours', {
	bucket: timestamp('bucket', { withTimezone: true }).primaryKey(),
	okCount: integer('ok_count').notNull(),
	failCount: integer('fail_count').notNull(),
	minMs: integer('min_ms').notNull(),
	avgMs: integer('avg_ms').notNull(),
	maxMs: integer('max_ms').notNull()
});
