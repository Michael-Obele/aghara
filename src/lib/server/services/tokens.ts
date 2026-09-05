// API token service — create (hash + show once), list, revoke, lookup.
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { apiTokens } from '$lib/server/db/schema';
import { AppError } from './errors';
import { checkLimit } from './billing';

export function hashToken(raw: string): string {
	return createHash('sha256').update(raw).digest('hex');
}

export async function createToken(
	userId: string,
	name: string
): Promise<{ id: string; name: string; raw: string }> {
	await checkLimit(userId, 'tokens');
	const raw = randomBytes(32).toString('hex');
	const [row] = await db
		.insert(apiTokens)
		.values({ userId, name, tokenHash: hashToken(raw) })
		.returning({ id: apiTokens.id, name: apiTokens.name });
	return { id: row.id, name: row.name, raw };
}

export async function listTokens(userId: string) {
	return db
		.select({
			id: apiTokens.id,
			name: apiTokens.name,
			createdAt: apiTokens.createdAt,
			lastUsedAt: apiTokens.lastUsedAt,
			revokedAt: apiTokens.revokedAt
		})
		.from(apiTokens)
		.where(eq(apiTokens.userId, userId))
		.orderBy(apiTokens.createdAt);
}

export async function revokeToken(userId: string, id: string): Promise<{ ok: true }> {
	const [row] = await db
		.select({ id: apiTokens.id })
		.from(apiTokens)
		.where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId)));
	if (!row) throw new AppError('NOT_FOUND', 'Token not found', 404);
	await db.update(apiTokens).set({ revokedAt: new Date() }).where(eq(apiTokens.id, id));
	return { ok: true };
}

/** Look up a raw bearer token; returns the token row + user id, or null. */
export async function findUserByToken(
	raw: string
): Promise<{ userId: string; tokenId: string } | null> {
	const [row] = await db
		.select({ userId: apiTokens.userId, tokenId: apiTokens.id })
		.from(apiTokens)
		.where(and(eq(apiTokens.tokenHash, hashToken(raw)), isNull(apiTokens.revokedAt)));
	if (!row) return null;
	await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, row.tokenId));
	return row;
}
