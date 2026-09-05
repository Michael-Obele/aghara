// Universal layout — protects (app) routes via a remote auth query.
// No +layout.server.ts: pages use remote functions only.
import { redirect } from '@sveltejs/kit';
import { currentUserQuery, myPlanQuery } from '$lib/remote';

export const load = async ({ url }: { url: URL }) => {
	const user = await currentUserQuery();
	if (!user) {
		throw redirect(303, '/login');
	}
	// /billing is the paywall — always reachable so users can pick a plan.
	if (url.pathname.startsWith('/billing')) {
		return { user };
	}
	// No free tier: every route requires an active paid plan.
	const { plan } = await myPlanQuery();
	if (plan === null) {
		throw redirect(303, '/billing');
	}
	return { user, plan };
};
