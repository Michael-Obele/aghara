// Universal layout — protects (app) routes via a remote auth query.
// +layout.server.ts supplies the device-level time-format preference; this load
// re-exports it so pages get a typed timeFormat in their PageData.
import { redirect } from '@sveltejs/kit';
import { currentUserQuery, myPlanQuery } from '$lib/remote';
import type { LayoutServerData } from './$types';

export const load = async ({ url, data }: { url: URL; data: LayoutServerData }) => {
	const user = await currentUserQuery();
	if (!user) {
		throw redirect(303, '/login');
	}
	// /billing is the paywall — always reachable so users can pick a plan.
	if (url.pathname.startsWith('/billing')) {
		return { user, timeFormat: data.timeFormat };
	}
	// No free tier: every route requires an active paid plan.
	const { plan } = await myPlanQuery();
	if (plan === null) {
		throw redirect(303, '/billing');
	}
	return { user, plan, timeFormat: data.timeFormat };
};
