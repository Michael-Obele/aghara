// Retention — per-user history preference + auto-prune of finished posts.
//
// Default: auto-delete ON. Finished rows (posted/failed/canceled) older than
// RETENTION_DAYS are hard-deleted by the minutely scheduler, and orphaned
// `posts` rows (no scheduled rows left) are collected too. Queued rows are
// never touched. Flip `retainHistory` on to keep a permanent archive.
import { and, eq, inArray, isNull, lt, notExists, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { posts, scheduledPosts, userSettings } from '$lib/server/db/schema';

/** Finished posts are pruned this long after they settle. */
export const RETENTION_DAYS = 7;

export interface RetentionSettings {
	retainHistory: boolean;
}

/** Read settings; missing row means defaults (auto-delete ON). */
export async function getRetention(userId: string): Promise<RetentionSettings> {
	const [row] = await db
		.select({ retainHistory: userSettings.retainHistory })
		.from(userSettings)
		.where(eq(userSettings.userId, userId));
	return { retainHistory: row?.retainHistory ?? false };
}

/** Upsert the retain-history toggle. */
export async function setRetention(
	userId: string,
	retainHistory: boolean
): Promise<RetentionSettings> {
	await db
		.insert(userSettings)
		.values({ userId, retainHistory })
		.onConflictDoUpdate({
			target: userSettings.userId,
			set: { retainHistory, updatedAt: new Date() }
		});
	return { retainHistory };
}

/**
 * Hard-delete one scheduled row the user owns. Posted/failed/canceled only —
 * queued rows use cancel. Orphaned parent `posts` rows are collected.
 */
export async function deleteScheduled(
	userId: string,
	scheduledId: string
): Promise<{ deleted: number }> {
	const owned = await db
		.select({ id: scheduledPosts.id, postId: scheduledPosts.postId })
		.from(scheduledPosts)
		.innerJoin(posts, eq(scheduledPosts.postId, posts.id))
		.where(
			and(
				eq(scheduledPosts.id, scheduledId),
				eq(posts.userId, userId),
				inArray(scheduledPosts.status, ['posted', 'failed', 'canceled'])
			)
		);
	if (owned.length === 0) return { deleted: 0 };
	await db.delete(scheduledPosts).where(eq(scheduledPosts.id, scheduledId));
	await collectOrphanPosts();
	return { deleted: 1 };
}

/**
 * Hard-delete ALL finished rows the user owns (posted/failed/canceled).
 * Queued rows are untouched. Orphaned parent `posts` rows are collected.
 */
export async function clearHistory(userId: string): Promise<{ deleted: number }> {
	const owned = await db
		.select({ id: scheduledPosts.id })
		.from(scheduledPosts)
		.innerJoin(posts, eq(scheduledPosts.postId, posts.id))
		.where(
			and(
				eq(posts.userId, userId),
				inArray(scheduledPosts.status, ['posted', 'failed', 'canceled'])
			)
		);
	if (owned.length === 0) return { deleted: 0 };
	await db.delete(scheduledPosts).where(
		inArray(
			scheduledPosts.id,
			owned.map((r) => r.id)
		)
	);
	await collectOrphanPosts();
	return { deleted: owned.length };
}

/**
 * Minutely prune: hard-delete finished rows older than RETENTION_DAYS for
 * users who have NOT opted into retainHistory (missing settings row means
 * the default: auto-delete ON). Queued rows are never touched.
 *
 * Settle time is `postedAt` for posted rows; failed/canceled rows never get
 * a `postedAt`, so they settle on `runAt` (their schedule time has passed
 * by the time they fail; a canceled future post is kept until 7 days after
 * its runAt). Runs inside the existing scheduler tick — no new cron.
 */
export async function pruneHistory(now = new Date()): Promise<number> {
	const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
	const stale = await db
		.select({ id: scheduledPosts.id })
		.from(scheduledPosts)
		.innerJoin(posts, eq(scheduledPosts.postId, posts.id))
		.leftJoin(userSettings, eq(userSettings.userId, posts.userId))
		.where(
			and(
				or(
					and(eq(scheduledPosts.status, 'posted'), lt(scheduledPosts.postedAt, cutoff)),
					and(
						inArray(scheduledPosts.status, ['failed', 'canceled']),
						lt(scheduledPosts.runAt, cutoff)
					)
				),
				or(eq(userSettings.retainHistory, false), isNull(userSettings.retainHistory))
			)
		);
	if (stale.length === 0) return 0;
	await db.delete(scheduledPosts).where(
		inArray(
			scheduledPosts.id,
			stale.map((r) => r.id)
		)
	);
	console.log(
		`[aghara] pruneHistory: pruned ${stale.length} finished row(s) older than ${RETENTION_DAYS}d`
	);
	await collectOrphanPosts();
	return stale.length;
}

/** Delete parent `posts` rows that no scheduled row references anymore. */
async function collectOrphanPosts(): Promise<void> {
	await db
		.delete(posts)
		.where(
			notExists(
				db
					.select({ one: scheduledPosts.id })
					.from(scheduledPosts)
					.where(eq(scheduledPosts.postId, posts.id))
			)
		);
}
