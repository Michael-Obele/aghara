// GET /api/v1/health — public status endpoint (used by deploy health checks).
import { json } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { scheduledPosts } from '$lib/server/db/schema';

export async function GET() {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(scheduledPosts)
		.where(eq(scheduledPosts.status, 'queued'));
	return json({
		status: 'ok',
		version: '0.1.0',
		pending: row?.count ?? 0
	});
}
