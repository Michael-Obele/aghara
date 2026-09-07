#!/usr/bin/env node

import { McpServer } from 'tmcp';
import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { HttpTransport } from '@tmcp/transport-http';
import { StdioTransport } from '@tmcp/transport-stdio';
import { serve } from 'srvx';
import { registerTools } from './tools';

const server = new McpServer(
	{
		name: 'aghara-mcp',
		version: '0.1.0',
		description: 'Remote-control Aghara — the social scheduler — over its REST API.'
	},
	{
		adapter: new ValibotJsonSchemaAdapter(),
		capabilities: {
			tools: { listChanged: true }
		}
	}
);

registerTools(server);

// Streamable HTTP transport — what remote MCP clients (and Fly.io) use.
const http_transport = new HttpTransport(server, { path: '/mcp' });

const port = Number(process.env.PORT ?? 8000);

serve({
	port,
	hostname: '0.0.0.0',
	// Bun kills idle SSE streams after 10s by default (MCP Streamable HTTP).
	// srvx forwards `bun` → Bun.serve(). 0 = disabled
	bun: { idleTimeout: 0 },
	async fetch(request) {
		const url = new URL(request.url);
		if (url.pathname === '/health') {
			return Response.json({ status: 'ok', service: 'aghara-mcp' });
		}
		const http_response = await http_transport.respond(request);
		if (http_response) return http_response;
		return new Response(null, { status: 404 });
	}
});

// STDIO transport for local agent use (skipped in production on Fly.io).
if (process.env.NODE_ENV !== 'production') {
	const stdio_transport = new StdioTransport(server);
	stdio_transport.listen();
}
