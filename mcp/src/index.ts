#!/usr/bin/env node
// Bun entry — serves Streamable HTTP (Fly.io / `bunx aghara-mcp --http`) and
// STDIO (default: `bunx aghara-mcp` for local editors). Shares createHandler()
// with worker.ts (Cloudflare).

import { StdioTransport } from '@tmcp/transport-stdio';
import { serve } from 'srvx';
import { createHandler } from './server';

const { server, handleRequest } = createHandler({
	AGHARA_BASE_URL: process.env.AGHARA_BASE_URL,
	AGHARA_API_TOKEN: process.env.AGHARA_API_TOKEN
});

const wantsHttp =
	process.argv.includes('--http') ||
	process.env.NODE_ENV === 'production' ||
	Boolean(process.env.PORT);

if (!wantsHttp) {
	// Local editor mode: STDIO only (Claude Desktop, VS Code, Codex).
	const stdio_transport = new StdioTransport(server);
	stdio_transport.listen();
} else {
	const port = Number(process.env.PORT ?? 8000);

	serve({
		port,
		hostname: '0.0.0.0',
		// Bun kills idle SSE streams after 10s by default (MCP Streamable HTTP).
		// srvx forwards `bun` → Bun.serve(). 0 = disabled
		bun: { idleTimeout: 0 },
		async fetch(request) {
			const http_response = await handleRequest(request);
			if (http_response) return http_response;
			return new Response(null, { status: 404 });
		}
	});

	// Local HTTP dev: also offer STDIO alongside the server.
	if (process.env.NODE_ENV !== 'production') {
		const stdio_transport = new StdioTransport(server);
		stdio_transport.listen();
	}
}
