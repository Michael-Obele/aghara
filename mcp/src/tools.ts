// Aghara MCP tools — 4 tools, resource-oriented multiplexing (sepia-style).
// Each tool is a thin forwarder to one REST endpoint family. No business logic here.
// NOTE: token management is intentionally UI-only — an MCP client holding a token
// must never be able to mint/revoke tokens (privilege escalation).
import * as v from 'valibot';
import { tool } from 'tmcp/utils';
import type { McpServer } from 'tmcp';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { api, type ApiFn } from './client';

const CHANNELS = ['bluesky', 'telegram', 'discord', 'mastodon', 'linkedin', 'threads'] as const;

const HealthSchema = v.object({});

const PlatformsSchema = v.object({});

const TargetObject = v.object({
	channelAccountId: v.pipe(v.string(), v.uuid()),
	runAt: v.pipe(v.string(), v.isoTimestamp())
});

// Some MCP gateways stringify array args (targets arrives as "[{...}]"
// instead of [{...}]). Accept both: native array for JSON Schema, plus
// string for gateways — coercion happens at runtime in the handler because
// v.transform cannot be converted to JSON Schema by the adapter.
const TargetsSchema = v.union([v.pipe(v.array(TargetObject), v.minLength(1)), v.string()]);
const SegmentsSchema = v.union([
	v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(2000))),
	v.string()
]);
const MediaUrlsSchema = v.union([v.array(v.pipe(v.string(), v.url())), v.string()]);

function coerceArray<T>(val: unknown): T[] | undefined {
	if (typeof val === 'string') {
		try {
			const parsed = JSON.parse(val);
			return Array.isArray(parsed) ? (parsed as T[]) : undefined;
		} catch {
			return undefined;
		}
	}
	return val as T[] | undefined;
}

const ConnectAccountInputSchema = v.object({
	action: v.literal('connect'),
	channel: v.picklist(CHANNELS),
	label: v.optional(v.string(), ''),
	handle: v.optional(v.string()),
	appPassword: v.optional(v.string()),
	botToken: v.optional(v.string()),
	chatId: v.optional(v.string()),
	webhookUrl: v.optional(v.string()),
	instanceUrl: v.optional(v.string()),
	accessToken: v.optional(v.string()),
	userId: v.optional(v.string())
});

const AccountsInputSchema = v.variant('action', [
	v.object({ action: v.literal('list') }),
	ConnectAccountInputSchema,
	v.object({ action: v.literal('disconnect'), id: v.pipe(v.string(), v.uuid()) })
]);

const PostsInputSchema = v.variant('action', [
	v.object({
		action: v.literal('list'),
		status: v.optional(v.picklist(['queued', 'posted', 'failed', 'canceled']))
	}),
	v.object({
		action: v.literal('create'),
		// Mirrors CreatePostSchema: generous cap (thread platforms auto-split),
		// plus optional explicit thread segments (each ≤2000).
		body: v.pipe(v.string(), v.minLength(1), v.maxLength(20000)),
		segments: v.optional(SegmentsSchema, []),
		mediaUrls: v.optional(MediaUrlsSchema, []),
		timezone: v.optional(v.string()),
		targets: TargetsSchema
	}),
	v.object({ action: v.literal('publish_now'), scheduledId: v.pipe(v.string(), v.uuid()) }),
	v.object({ action: v.literal('cancel'), scheduledId: v.pipe(v.string(), v.uuid()) }),
	v.object({
		action: v.literal('retry'),
		scheduledId: v.pipe(v.string(), v.uuid()),
		runAt: v.pipe(v.string(), v.isoTimestamp())
	}),
	v.object({
		action: v.literal('update'),
		scheduledId: v.pipe(v.string(), v.uuid()),
		body: v.pipe(v.string(), v.minLength(1), v.maxLength(20000)),
		segments: v.optional(SegmentsSchema, []),
		runAt: v.optional(v.pipe(v.string(), v.isoTimestamp()))
	}),
	v.object({ action: v.literal('delete'), scheduledId: v.pipe(v.string(), v.uuid()) }),
	v.object({ action: v.literal('clear_history') }),
	v.object({ action: v.literal('get_retention') }),
	v.object({ action: v.literal('set_retention'), retainHistory: v.boolean() })
]);

const CONNECT_FIELDS = [
	'handle',
	'appPassword',
	'botToken',
	'chatId',
	'webhookUrl',
	'instanceUrl',
	'accessToken',
	'userId'
] as const;

/** Forward a REST call and return the JSON payload as text content. */
async function json(apiFn: ApiFn, path: string, init?: { method?: string; body?: unknown }) {
	const data = await apiFn(path, init);
	return tool.text(JSON.stringify(data, null, 2));
}

/** Per-request api client: ctx.apiFn (from the Authorization header) wins, else the env default. */
function clientOf(server: { ctx?: { custom?: { apiFn?: ApiFn } } }, fallback: ApiFn): ApiFn {
	return server.ctx?.custom?.apiFn ?? fallback;
}

export function registerTools(server: McpServer<any, any>, apiFn: ApiFn = api): void {
	server.tool<typeof HealthSchema>(
		{
			name: 'aghara_health',
			description: 'Check the Aghara service status. Public — no API token required.',
			schema: HealthSchema
		},
		async () => {
			try {
				return await json(clientOf(server, apiFn), '/api/v1/health');
			} catch (err) {
				return tool.error(toMessage(err));
			}
		}
	);

	server.tool<typeof AccountsInputSchema>(
		{
			name: 'aghara_accounts',
			description:
				'Manage connected channel accounts. Actions: list — show all connected accounts; connect — add a channel account (bluesky/telegram/discord/mastodon/linkedin/threads); disconnect — remove an account by id.',
			schema: AccountsInputSchema
		},
		async (input) => {
			const client = clientOf(server, apiFn);
			try {
				if (input.action === 'list') {
					return await json(client, '/api/v1/accounts');
				}
				if (input.action === 'disconnect') {
					return await json(client, `/api/v1/accounts/${input.id}`, { method: 'DELETE' });
				}
				// connect — forward only the fields the chosen channel needs
				const body: Record<string, unknown> = { channel: input.channel, label: input.label };
				for (const key of CONNECT_FIELDS) {
					const value = input[key];
					if (value !== undefined && value !== '') body[key] = value;
				}
				return await json(client, '/api/v1/accounts', { method: 'POST', body });
			} catch (err) {
				return tool.error(toMessage(err));
			}
		}
	);

	server.tool<typeof PostsInputSchema>(
		{
			name: 'aghara_posts',
			description:
				'Manage scheduled posts. Actions: list — list scheduled posts (optional status filter); create — schedule a new post with targets (body ≤20000, optional IANA timezone; call aghara_platforms FIRST to check the per-channel limit — over-limit text auto-splits into a thread/series on Bluesky/Mastodon/Threads/Telegram/Discord but is REJECTED on LinkedIn; pass explicit segments[] for thread parts, each ≤2000); publish_now — publish a queued post immediately; cancel — cancel a queued post; retry — re-queue a failed post at a new ISO time (runAt); update — edit a post that has not been sent yet (body ≤20000, optional segments[]; optional runAt ISO to reschedule — queued posts only); delete — hard-delete a finished post (posted/failed/canceled only); clear_history — hard-delete ALL finished posts (queued untouched); get_retention — read the retain-history toggle (default off: finished posts auto-delete after 7 days); set_retention — set retainHistory true/false to keep history forever or auto-delete.',
			schema: PostsInputSchema
		},
		async (input) => {
			const client = clientOf(server, apiFn);
			try {
				switch (input.action) {
					case 'list': {
						const qs = input.status ? `?status=${input.status}` : '';
						return await json(client, `/api/v1/posts${qs}`);
					}
					case 'create': {
						// Gateways may stringify arrays — coerce before forwarding.
						const targets = coerceArray(input.targets) as typeof input.targets;
						const segments = coerceArray(input.segments) as typeof input.segments;
						const mediaUrls = coerceArray(input.mediaUrls) as typeof input.mediaUrls;
						return await json(client, '/api/v1/posts', {
							method: 'POST',
							body: {
								body: input.body,
								segments: segments ?? [],
								mediaUrls,
								timezone: input.timezone,
								targets
							}
						});
					}
					case 'publish_now':
						return await json(client, `/api/v1/posts/${input.scheduledId}/publish-now`, {
							method: 'POST'
						});
					case 'cancel':
						return await json(client, `/api/v1/scheduled/${input.scheduledId}`, {
							method: 'DELETE'
						});
					case 'retry':
						return await json(client, `/api/v1/scheduled/${input.scheduledId}/retry`, {
							method: 'POST',
							body: { runAt: input.runAt }
						});
					case 'update': {
						// Gateways may stringify segments — coerce before forwarding.
						const segments = coerceArray(input.segments) as typeof input.segments;
						const payload: Record<string, unknown> = {
							body: input.body,
							segments: segments ?? []
						};
						if (input.runAt) payload.runAt = input.runAt;
						return await json(client, `/api/v1/scheduled/${input.scheduledId}`, {
							method: 'PATCH',
							body: payload
						});
					}
					case 'delete':
						return await json(client, `/api/v1/scheduled/${input.scheduledId}?hard=true`, {
							method: 'DELETE'
						});
					case 'clear_history':
						return await json(client, '/api/v1/posts/history', { method: 'DELETE' });
					case 'get_retention':
						return await json(client, '/api/v1/settings/retention');
					case 'set_retention':
						return await json(client, '/api/v1/settings/retention', {
							method: 'PUT',
							body: { retainHistory: input.retainHistory }
						});
				}
			} catch (err) {
				return tool.error(toMessage(err));
			}
		}
	);

	server.tool<typeof PlatformsSchema>(
		{
			name: 'aghara_platforms',
			description:
				'Read-only capability matrix: per-channel char limits plus thread/sequentialSplit features. Call BEFORE create to warn the user when text will auto-split into a thread/series (e.g. over 300 chars on Bluesky) or be rejected (over-limit on LinkedIn, which cannot split).',
			schema: PlatformsSchema
		},
		async () => {
			try {
				return await json(clientOf(server, apiFn), '/api/v1/platforms');
			} catch (err) {
				return tool.error(toMessage(err));
			}
		}
	);
}

function toMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Aghara API request failed';
}
