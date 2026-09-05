// Publisher — claim-then-publish. Used by the minutely cron AND publish-now.
// Idempotency: each row is claimed with a conditional UPDATE (status='queued')
// before publishing; an in-memory in-flight set guards against a slow publish
// being re-claimed by the next cron tick in the same process.
import { and, eq, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { channelAccounts, posts, scheduledPosts } from '$lib/server/db/schema';
import { decryptObject } from './crypto';
import { getProvider } from '$lib/server/providers';

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 50;
const inFlight = new Set<string>();

/** Publish every due queued row. Returns how many were processed. */
export async function publishDue(): Promise<number> {
	const due = await db
		.select({ id: scheduledPosts.id })
		.from(scheduledPosts)
		.where(and(eq(scheduledPosts.status, 'queued'), lte(scheduledPosts.runAt, new Date())))
		.limit(BATCH_SIZE);

	let processed = 0;
	for (const row of due) {
		if (inFlight.has(row.id)) continue;
		inFlight.add(row.id);
		try {
			await publishOne(row.id);
			processed++;
		} finally {
			inFlight.delete(row.id);
		}
	}
	return processed;
}

/** Publish a single scheduled post. No-op if it's no longer queued. */
export async function publishOne(scheduledId: string): Promise<void> {
	// Claim: only the runner that flips attempts wins; status must still be queued.
	const claimed = await db
		.update(scheduledPosts)
		.set({ attempts: sql`${scheduledPosts.attempts} + 1` })
		.where(and(eq(scheduledPosts.id, scheduledId), eq(scheduledPosts.status, 'queued')))
		.returning();
	if (claimed.length === 0) return;

	const row = claimed[0];
	const [post, account] = await Promise.all([
		db.select().from(posts).where(eq(posts.id, row.postId)).limit(1),
		db.select().from(channelAccounts).where(eq(channelAccounts.id, row.channelAccountId)).limit(1)
	]);
	if (!post[0] || !account[0]) {
		await markFailed(row.id, row.attempts, 'Missing post or account');
		return;
	}

	let creds: Record<string, unknown>;
	try {
		creds = decryptObject<Record<string, unknown>>(account[0].credentials);
	} catch {
		await markFailed(row.id, row.attempts, 'Failed to decrypt credentials');
		return;
	}

	try {
		const provider = getProvider(account[0].channel);
		const result = await provider.publish(
			{ body: post[0].body, mediaUrls: post[0].mediaUrls ?? [] },
			creds
		);
		await db
			.update(scheduledPosts)
			.set({
				status: 'posted',
				postedUrl: result.url ?? null,
				postedAt: new Date(),
				lastError: null
			})
			.where(eq(scheduledPosts.id, row.id));
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		await markFailed(row.id, row.attempts, message);
	}
}

async function markFailed(id: string, attempts: number, message: string): Promise<void> {
	if (attempts >= MAX_ATTEMPTS) {
		await db
			.update(scheduledPosts)
			.set({ status: 'failed', lastError: message })
			.where(eq(scheduledPosts.id, id));
	} else {
		// Keep queued; the next cron tick retries with backoff.
		await db
			.update(scheduledPosts)
			.set({ status: 'queued', lastError: message })
			.where(eq(scheduledPosts.id, id));
	}
}
