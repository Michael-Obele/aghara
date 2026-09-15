// Posts service — create / list / publish-now / cancel.
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { channelAccounts, posts, scheduledPosts } from '$lib/server/db/schema';
import { AppError, Errors } from './errors';
import { checkLimit } from './billing';
import { publishOne } from './publisher';
import { noteScheduleChange } from '$lib/server/scheduler';
import { getProvider } from '$lib/server/providers';
import { graphemes, resolveSegments } from '$lib/server/providers/types';
import { Temporal } from 'temporal-polyfill';
import type { CreatePostInput, UpdatePostInput } from '$lib/schemas/post';

/** Parse an ISO instant strictly — requires a UTC offset/Z so ambiguous local strings are rejected. */
function toInstant(iso: string): Temporal.Instant {
	try {
		return Temporal.Instant.from(iso);
	} catch {
		throw new AppError(
			'INVALID_RUN_AT',
			'runAt must be an ISO 8601 instant with a UTC offset.',
			400
		);
	}
}

/** Validate an IANA timezone id — rejects unknown zones. */
function toTimeZoneId(timeZone: string): string {
	try {
		return Temporal.Now.zonedDateTimeISO(timeZone).timeZoneId;
	} catch {
		throw new AppError('INVALID_TIMEZONE', `Unknown timezone: ${timeZone}`, 400);
	}
}

export async function createPost(
	userId: string,
	input: CreatePostInput
): Promise<{ postId: string; scheduledIds: string[] }> {
	await checkLimit(userId, 'scheduled');

	// All run_at values must be future instants; the schedule's IANA timezone is
	// validated once and stored on every row (runAt itself stays absolute).
	const nowMs = Temporal.Now.instant().epochMilliseconds;
	const timezone = toTimeZoneId(input.timezone ?? 'UTC');
	for (const target of input.targets) {
		if (toInstant(target.runAt).epochMilliseconds <= nowMs) {
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
		// Thread platforms (auto-split) and sequential-split platforms handle long
		// text themselves; only single-post platforms (e.g. LinkedIn) must fit.
		if (!provider.features.threads && !provider.features.sequentialSplit) {
			const combined = resolveSegments(input).join('\n\n');
			const len = graphemes(combined);
			if (len > provider.maxLength) {
				throw new AppError(
					'TOO_LONG',
					`${provider.name} allows ${provider.maxLength} characters and cannot split into a thread. This post is ${len}.`,
					400
				);
			}
		}
	}

	const [post] = await db
		.insert(posts)
		.values({
			userId,
			body: input.body,
			segments: input.segments ?? [],
			mediaUrls: input.mediaUrls
		})
		.returning({ id: posts.id });

	const inserted = await db
		.insert(scheduledPosts)
		.values(
			input.targets.map((t) => ({
				postId: post.id,
				channelAccountId: t.channelAccountId,
				runAt: new Date(toInstant(t.runAt).epochMilliseconds),
				timezone
			}))
		)
		.returning({ id: scheduledPosts.id });

	console.log(
		`[aghara] createPost: user=${userId} post=${post.id} scheduled=${inserted.map((r) => r.id).join(', ')} targets=${input.targets.map((t) => `${t.channelAccountId}@${t.runAt}`).join(', ')}`
	);

	// Hand the scheduler the earliest new deadline: it can wake exactly then
	// instead of asking the database whether anything is due.
	noteScheduleChange(Math.min(...input.targets.map((t) => toInstant(t.runAt).epochMilliseconds)));

	return { postId: post.id, scheduledIds: inserted.map((r) => r.id) };
}

export interface ScheduledRow {
	scheduledId: string;
	postId: string;
	body: string;
	segments: string[];
	channel: string;
	label: string;
	runAt: Date;
	timezone: string;
	status: string;
	attempts: number;
	lastError: string | null;
	postedUrl: string | null;
	postedUrls: string[];
	postedAt: Date | null;
}

export async function listScheduled(userId: string, status?: string): Promise<ScheduledRow[]> {
	const rows = await db
		.select({
			scheduledId: scheduledPosts.id,
			postId: posts.id,
			body: posts.body,
			segments: posts.segments,
			channel: channelAccounts.channel,
			label: channelAccounts.label,
			runAt: scheduledPosts.runAt,
			timezone: scheduledPosts.timezone,
			status: scheduledPosts.status,
			attempts: scheduledPosts.attempts,
			lastError: scheduledPosts.lastError,
			postedUrl: scheduledPosts.postedUrl,
			postedUrls: scheduledPosts.postedUrls,
			postedAt: scheduledPosts.postedAt
		})
		.from(scheduledPosts)
		.innerJoin(posts, eq(scheduledPosts.postId, posts.id))
		.innerJoin(channelAccounts, eq(scheduledPosts.channelAccountId, channelAccounts.id))
		.where(and(eq(posts.userId, userId), status ? eq(scheduledPosts.status, status) : undefined))
		.orderBy(desc(scheduledPosts.runAt));

	return rows.map((r) => ({
		...r,
		segments: r.segments ?? [],
		postedUrls: r.postedUrls ?? [],
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
	// The row left the queue, so the next deadline may have moved.
	noteScheduleChange();

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
	// The earliest deadline may have just moved later; the next tick re-reads the plan.
	noteScheduleChange();
	return { ok: true };
}

/** Re-queue a failed post at a new time. Resets attempts + clears the last error. */
export async function retryScheduled(
	userId: string,
	scheduledId: string,
	runAt: string
): Promise<{ scheduledId: string; runAt: Date; status: 'queued' }> {
	const [row] = await db
		.select({ id: scheduledPosts.id, status: scheduledPosts.status })
		.from(scheduledPosts)
		.innerJoin(posts, eq(scheduledPosts.postId, posts.id))
		.where(and(eq(scheduledPosts.id, scheduledId), eq(posts.userId, userId)));
	if (!row) throw new AppError('NOT_FOUND', 'Scheduled post not found', 404);
	if (row.status !== 'failed') {
		throw new AppError('NOT_FAILED', 'Only failed posts can be retried', 409);
	}

	const when = toInstant(runAt);
	if (when.epochMilliseconds <= Temporal.Now.instant().epochMilliseconds) throw Errors.pastRunAt();
	const whenDate = new Date(when.epochMilliseconds);

	await db
		.update(scheduledPosts)
		.set({ status: 'queued', attempts: 0, lastError: null, runAt: whenDate })
		.where(eq(scheduledPosts.id, scheduledId));
	noteScheduleChange(whenDate.getTime());
	return { scheduledId, runAt: whenDate, status: 'queued' };
}

/** Edit a post that hasn't been sent yet (queued or failed). The body/segments
 *  live on the shared `posts` row, so every unsent copy of this post updates
 *  together; `runAt` optionally reschedules the row while it is still queued. */
export async function updateScheduled(
	userId: string,
	input: UpdatePostInput
): Promise<{ scheduledId: string; runAt: Date; status: string }> {
	const [row] = await db
		.select({
			id: scheduledPosts.id,
			status: scheduledPosts.status,
			postId: scheduledPosts.postId,
			runAt: scheduledPosts.runAt,
			channel: channelAccounts.channel
		})
		.from(scheduledPosts)
		.innerJoin(posts, eq(scheduledPosts.postId, posts.id))
		.innerJoin(channelAccounts, eq(scheduledPosts.channelAccountId, channelAccounts.id))
		.where(and(eq(scheduledPosts.id, input.scheduledId), eq(posts.userId, userId)));
	if (!row) throw new AppError('NOT_FOUND', 'Scheduled post not found', 404);
	// An edit can move a run time or change what is queued; re-read the plan next tick.
	noteScheduleChange();
	if (row.status !== 'queued' && row.status !== 'failed') {
		throw new AppError('NOT_EDITABLE', 'Only posts that have not been sent can be edited', 409);
	}

	// Single-post platforms (e.g. LinkedIn) can't split — enforce the limit here.
	const provider = getProvider(row.channel);
	if (!provider.features.threads && !provider.features.sequentialSplit) {
		const combined = resolveSegments(input).join('\n\n');
		const len = graphemes(combined);
		if (len > provider.maxLength) {
			throw new AppError(
				'TOO_LONG',
				`${provider.name} allows ${provider.maxLength} characters and cannot split into a thread. This post is ${len}.`,
				400
			);
		}
	}

	// Reschedule only while queued — failed rows pick a time via Retry.
	const currentRunAtMs = new Date(row.runAt).getTime();
	let runAtMs = currentRunAtMs;
	if (input.runAt !== undefined && row.status === 'queued') {
		const when = toInstant(input.runAt);
		if (when.epochMilliseconds <= Temporal.Now.instant().epochMilliseconds)
			throw Errors.pastRunAt();
		runAtMs = when.epochMilliseconds;
	}
	const runAt = new Date(runAtMs);

	await db
		.update(posts)
		.set({ body: input.body, segments: input.segments ?? [] })
		.where(eq(posts.id, row.postId));
	if (runAtMs !== currentRunAtMs) {
		await db.update(scheduledPosts).set({ runAt }).where(eq(scheduledPosts.id, row.id));
	}

	console.log(
		`[aghara] updateScheduled: user=${userId} scheduled=${row.id} post=${row.postId} status=${row.status} runAt=${runAt.toISOString()}`
	);

	return { scheduledId: row.id, runAt, status: row.status };
}
