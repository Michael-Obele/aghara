// Applies Drizzle migrations at container start (Koyeb / Fly.io).
// Run with: bun scripts/migrate.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set — cannot run migrations');
	process.exit(1);
}

const sql = neon(url);
const db = drizzle(sql);

await migrate(db, { migrationsFolder: 'drizzle' });
console.log('[aghara] migrations applied');
