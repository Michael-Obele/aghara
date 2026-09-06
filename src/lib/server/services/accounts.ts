// Channel account service — list / connect / disconnect.
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { channelAccounts, scheduledPosts } from '$lib/server/db/schema';
import { encryptObject } from './crypto';
import { getProvider } from '$lib/server/providers';
import { AppError } from './errors';
import { checkLimit } from './billing';
import type { ConnectAccountInput } from '$lib/schemas/account';

export async function listAccounts(userId: string) {
	return db
		.select({
			id: channelAccounts.id,
			channel: channelAccounts.channel,
			label: channelAccounts.label,
			createdAt: channelAccounts.createdAt
		})
		.from(channelAccounts)
		.where(eq(channelAccounts.userId, userId))
		.orderBy(asc(channelAccounts.createdAt));
}

function defaultLabel(input: ConnectAccountInput): string {
	switch (input.channel) {
		case 'bluesky':
			return input.handle;
		case 'telegram':
			return `Telegram ${input.chatId}`;
		case 'discord':
			return 'Discord webhook';
		case 'mastodon':
			try {
				return new URL(input.instanceUrl).host;
			} catch {
				return input.instanceUrl;
			}
		case 'linkedin':
			return 'LinkedIn';
		case 'threads':
			return 'Threads';
	}
}

export async function connectAccount(
	userId: string,
	input: ConnectAccountInput
): Promise<{ id: string; channel: string; label: string }> {
	await checkLimit(userId, 'accounts');

	const provider = getProvider(input.channel);
	console.log(`[aghara] connectAccount: user=${userId} channel=${input.channel}`);

	// Verify credentials at connect time; providers may return extra fields
	// (e.g. LinkedIn resolves the author URN from the token).
	const extra = await provider.verify(input as unknown as Record<string, unknown>);

	const { label: _label, ...credentialFields } = input;
	const creds: Record<string, unknown> = { ...credentialFields, ...(extra ?? {}) };
	const label = input.label?.trim() || defaultLabel(input);

	const encrypted = encryptObject(creds);
	console.log(`[aghara] connectAccount: encrypted ${input.channel} (label=${label})`);
	try {
		const [row] = await db
			.insert(channelAccounts)
			.values({ userId, channel: input.channel, label, credentials: encrypted })
			.returning({
				id: channelAccounts.id,
				channel: channelAccounts.channel,
				label: channelAccounts.label
			});
		console.log(
			`[aghara] connectAccount: inserted ${row.id} channel=${row.channel} label=${row.label}`
		);
		return row;
	} catch (err) {
		if (err instanceof Error && /duplicate key/i.test(err.message)) {
			throw new AppError('DUPLICATE_ACCOUNT', 'That account is already connected.', 409);
		}
		throw err;
	}
}

export async function disconnectAccount(userId: string, id: string): Promise<{ ok: true }> {
	const [account] = await db
		.select({ id: channelAccounts.id })
		.from(channelAccounts)
		.where(and(eq(channelAccounts.id, id), eq(channelAccounts.userId, userId)));
	if (!account) throw new AppError('NOT_FOUND', 'Account not found', 404);

	// Cancel queued posts targeting this account.
	await db
		.update(scheduledPosts)
		.set({ status: 'canceled' })
		.where(and(eq(scheduledPosts.channelAccountId, id), eq(scheduledPosts.status, 'queued')));

	await db.delete(channelAccounts).where(eq(channelAccounts.id, id));
	return { ok: true };
}
