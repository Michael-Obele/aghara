// Remote functions for billing (pages only — no HTTP to /api/v1).
import { query, command } from '$app/server';
import { getPlan, startCheckout, isSelfHost } from '$lib/server/services/billing';
import { requireUser } from '$lib/server/session';

export const myPlanQuery = query(async () => {
	const user = requireUser();
	return getPlan(user.id);
});

export const isSelfHostQuery = query(async () => isSelfHost());

export const startCheckoutCommand = command(
	'unchecked',
	async ({ variant }: { variant: 'creator' | 'pro' }) => {
		const user = requireUser();
		const url = await startCheckout(user.id, user.email, variant);
		return { url };
	}
);
