// Shared MCP server factory — runtime-agnostic (Bun/Fly + Workers).
// Both entries (index.ts for Bun, worker.ts for Cloudflare) build the same
// McpServer + HttpTransport and route through handleRequest().
import { McpServer } from 'tmcp';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { HttpTransport } from '@tmcp/transport-http';
import { createApi, type ApiFn } from './client';
import { registerTools } from './tools';

export interface AgharaCtx extends Record<string, unknown> {
	apiFn: ApiFn;
}

export interface AgharaEnv {
	AGHARA_BASE_URL?: string;
	AGHARA_API_TOKEN?: string;
}

/** Extract a per-request Bearer token (VS Code `headers.Authorization`). */
export function bearerFromRequest(request: Request): string {
	const header = request.headers.get('authorization') ?? '';
	const match = /^Bearer\s+(.+)$/i.exec(header.trim());
	return match ? match[1].trim() : '';
}

export function createHandler(env: AgharaEnv) {
	const baseUrl = env.AGHARA_BASE_URL ?? 'http://localhost:5173';
	const fallbackToken = env.AGHARA_API_TOKEN ?? '';
	const defaultApi = createApi({ baseUrl, token: fallbackToken });

	const server = new McpServer(
		{
			name: 'aghara-mcp',
			version: '0.1.1',
			description: 'Remote-control Aghara — the social scheduler — over its REST API.'
		},
		{
			adapter: new ValibotJsonSchemaAdapter(),
			capabilities: {
				tools: { listChanged: true }
			}
		}
	).withContext<AgharaCtx>();

	registerTools(server, defaultApi);

	const transport = new HttpTransport<AgharaCtx>(server, { path: '/mcp' });

	return {
		server,
		transport,
		async handleRequest(request: Request): Promise<Response | null> {
			const url = new URL(request.url);
			if (url.pathname === '/health') {
				return Response.json({ status: 'ok', service: 'aghara-mcp' });
			}
			// Per-request Bearer wins (VS Code headers); else the env token.
			const bearer = bearerFromRequest(request);
			const apiFn = bearer ? createApi({ baseUrl, token: bearer }) : defaultApi;
			return transport.respond(request, { apiFn });
		}
	};
}
