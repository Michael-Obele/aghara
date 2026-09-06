// Remote functions for platform capabilities (pages only — no HTTP to /api/v1).
// Exposes each platform's limits + feature flags so the compose UI can show
// per-network hints (char limits, thread/split behaviour) from one source of truth.
import { query } from '$app/server';
import { listPlatforms } from '$lib/server/providers';
import { requireUserId } from '$lib/server/session';

export const listPlatformsQuery = query(async () => {
	requireUserId();
	return listPlatforms();
});
