// Cloudflare Workers entry — plain fetch handler, no Node/Bun APIs.
// Secrets come from Worker env (wrangler secret / vars), not process.env.
import { createHandler, type AgharaEnv } from './server';

interface WorkerEnv extends AgharaEnv {
	AGHARA_BASE_URL?: string;
	AGHARA_API_TOKEN?: string;
}

export default {
	async fetch(request: Request, env: WorkerEnv): Promise<Response> {
		const { handleRequest } = createHandler(env);
		const response = await handleRequest(request);
		if (response) return response;
		return new Response(null, { status: 404 });
	}
};
