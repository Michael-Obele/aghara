// Seeds the admin account (admin@svelte-apps.me by default): role=admin + pro for life.
// Idempotent — safe to run any time against a live DB.
// Run: bun run seed:admin   (requires DATABASE_URL + ADMIN_PASSWORD)
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { account, subscriptions, user } from '../src/lib/server/db/schema';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set — cannot seed admin');
	process.exit(1);
}

const email = process.env.ADMIN_EMAIL ?? 'admin@svelte-apps.me';
const password = process.env.ADMIN_PASSWORD;
if (!password || password.length < 8) {
	console.error('ADMIN_PASSWORD is required (min 8 characters)');
	process.exit(1);
}

const db = drizzle(neon(url));

const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
const userId = existing?.id ?? randomUUID();

if (!existing) {
	await db.insert(user).values({
		id: userId,
		name: 'Admin',
		email,
		emailVerified: true,
		role: 'admin'
	});
	// Credential account in Better Auth's expected shape so email/password login works.
	const hashed = await hashPassword(password);
	await db.insert(account).values({
		id: randomUUID(),
		issuer: 'local:credential',
		providerId: 'credential',
		accountId: userId,
		userId,
		password: hashed
	});
	console.log(`[seed] created admin user ${email}`);
} else {
	await db.update(user).set({ role: 'admin', emailVerified: true }).where(eq(user.id, userId));
	console.log(`[seed] admin user ${email} already exists — role set to admin`);
}

// Pro for life: active pro subscription with no expiry (current_period_end = NULL).
await db
	.insert(subscriptions)
	.values({ userId, plan: 'pro', status: 'active', currentPeriodEnd: null })
	.onConflictDoUpdate({
		target: subscriptions.userId,
		set: { plan: 'pro', status: 'active', currentPeriodEnd: null }
	});
console.log('[seed] pro-for-life subscription ensured');
