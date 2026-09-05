// Posts service — create / list / publish-now / cancel.
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { channelAccounts, posts, scheduledPosts } from '$lib/server/db/schema';
import { AppError, Errors } from './errors';
import { checkLimit } from './billing';
import { publishOne } from './publisher';
import { countGraphemes } from '$lib/server/providers/bluesky';
import { getProvider } from '$lib/server/providers';
import type { CreatePostInput } from '$lib/schemas/post';

export async function createPost(
	userId: string,
	input: CreatePostInput
): Promise<{ postId: string; scheduledIds: string[] }> {
	await checkLimit(userId, 'scheduled');

	// All run_at values must be in the future.
	const now = Date.now();
	for (const target of input.targets) {
		if (new Date(target.runAt).getTime() <= now) {
			throw Errors.pastRunAt();
		}
	}

	// Every target account must exist and belong to the user.
	const accountIds = [...new Set(input.targets.map((t) => t.channelAccountId))];
	const accounts = await db
		.select()
		.from(channelAccounts)
		.where(and(inArray(channelAccounts.id, accountIds), eq(channelAccounts.userId, userId)));
	const accountById = new Map(accounts.map((a) => [a.id, a]));
	for (const target of input.targets) {
		const account = accountById.get(target.channelAccountId);
		if (!account) throw new AppError('NOT_FOUND', 'Channel account not found', 404);
		const provider = getProvider(account.channel);
		if (provider.channel === 'bluesky' && countGraphemes(input.body) > 300) {
			throw new AppError(
				'TOO_LONG',
				`Bluesky allows 300 characters. This post is ${countGraphemes(input.body)}.`,
				400
			);
		}
	}

	const [post] = await db
		.insert(posts)
		.values({ userId, body: input.body, mediaUrls: input.mediaUrls })
		.returning({ id: posts.id });

	const inserted = await db
		.insert(scheduledPosts)
		.values(
			input.targets.map((t) => ({
				postId: post.id,
				channelAccountId: t.channelAccountId,
				runAt: new Date(t.runAt),
				timezone: 'UTC'
			}))
		)
		.returning({ id: scheduledPosts.id });

	return { postId: post.id, scheduledIds: inserted.map((r) => r.id) };
}

export interface ScheduledRow {
	scheduledId: string;
	postId: string;
	body: string;
	channel: string;
	label: string;
	runAt: Date;
	status: string;
	attempts: number;
	lastError: string | null;
	postedUrl: string | null;
	postedAt: Date | null;
}

export async function listScheduled(userId: string, status?: string): Promise<ScheduledRow[]> {
	const rows = await db
		.select({
			scheduledId: scheduledPosts.id,
			postId: posts.id,
			body: posts.body,
			channel: channelAccounts.channel,
			label: channelAccounts.label,
			runAt: scheduledPosts.runAt,
			status: scheduledPosts.status,
			attempts: scheduledPosts.attempts,
			lastError: scheduledPosts.lastError,
			postedUrl: scheduledPosts.postedUrl,
			postedAt: scheduledPosts.postedAt
		})
		.from(scheduledPosts)
		.innerJoin(posts, eq(scheduledPosts.postId, posts.id))
		.innerJoin(channelAccounts, eq(scheduledPosts.channelAccountId, channelAccounts.id))
		.where(and(eq(posts.userId, userId), status ? eq(scheduledPosts.status, status) : undefined))
		.orderBy(desc(scheduledPosts.runAt));

	return rows.map((r) => ({
		...r,
		runAt: new Date(r.runAt),
		postedAt: r.postedAt ? new Date(r.postedAt) : null
	}));
}

export async function publishNow(
	userId: string,
	scheduledId: string
): Promise<{ scheduledId: string; status: string; postedUrl: string | null }> {
	const [row] = await db
		.select({ id: scheduledPosts.id, status: scheduledPosts.status })
		.from(scheduledPosts)
		.innerJoin(posts, eq(scheduledPosts.postId, posts.id))
		.where(and(eq(scheduledPosts.id, scheduledId), eq(posts.userId, userId)));
	if (!row) throw new AppError('NOT_FOUND', 'Scheduled post not found', 404);
	if (row.status !== 'queued') throw Errors.notQueued();

	await publishOne(scheduledId);

	const [fresh] = await db
		.select({ status: scheduledPosts.status, postedUrl: scheduledPosts.postedUrl })
		.from(scheduledPosts)
		.where(eq(scheduledPosts.id, scheduledId));
	return {
		scheduledId,
		status: fresh?.status ?? 'unknown',
		postedUrl: fresh?.postedUrl ?? null
	};
}

export async function cancelScheduled(userId: string, id: string): Promise<{ ok: true }> {
	const [row] = await db
		.select({ id: scheduledPosts.id, status: scheduledPosts.status })
		.from(scheduledPosts)
		.innerJoin(posts, eq(scheduledPosts.postId, posts.id))
		.where(and(eq(scheduledPosts.id, id), eq(posts.userId, userId)));
	if (!row) throw new AppError('NOT_FOUND', 'Scheduled post not found', 404);
	if (row.status !== 'queued') throw Errors.notQueued();

	await db.update(scheduledPosts).set({ status: 'canceled' }).where(eq(scheduledPosts.id, id));
	return { ok: true };
}
