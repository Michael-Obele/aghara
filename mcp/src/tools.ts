// Aghara MCP tools — 3 tools, resource-oriented multiplexing (sepia-style).
// Each tool is a thin forwarder to one REST endpoint family. No business logic here.
import * as v from 'valibot';
import { tool } from 'tmcp/utils';
import type { McpServer } from 'tmcp';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { api } from './client';

const CHANNELS = ['bluesky', 'telegram', 'discord', 'mastodon', 'linkedin', 'threads'] as const;

const HealthSchema = v.object({});

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
		body: v.pipe(v.string(), v.minLength(1), v.maxLength(2000)),
		mediaUrls: v.optional(v.array(v.pipe(v.string(), v.url())), []),
		targets: v.pipe(
			v.array(
				v.object({
					channelAccountId: v.pipe(v.string(), v.uuid()),
					runAt: v.pipe(v.string(), v.isoTimestamp())
				})
			),
			v.minLength(1)
		)
	}),
	v.object({ action: v.literal('publish_now'), scheduledId: v.pipe(v.string(), v.uuid()) }),
	v.object({ action: v.literal('cancel'), scheduledId: v.pipe(v.string(), v.uuid()) }),
	v.object({
		action: v.literal('retry'),
		scheduledId: v.pipe(v.string(), v.uuid()),
		runAt: v.pipe(v.string(), v.isoTimestamp())
	})
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
async function json(path: string, init?: { method?: string; body?: unknown }) {
	const data = await api(path, init);
	return tool.text(JSON.stringify(data, null, 2));
}

export function registerTools(server: McpServer<StandardSchemaV1>): void {
	server.tool<typeof HealthSchema>(
		{
			name: 'aghara_health',
			description: 'Check the Aghara service status. Public — no API token required.',
			schema: HealthSchema
		},
		async () => {
			try {
				return await json('/api/v1/health');
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
			try {
				if (input.action === 'list') {
					return await json('/api/v1/accounts');
				}
				if (input.action === 'disconnect') {
					return await json(`/api/v1/accounts/${input.id}`, { method: 'DELETE' });
				}
				// connect — forward only the fields the chosen channel needs
				const body: Record<string, unknown> = { channel: input.channel, label: input.label };
				for (const key of CONNECT_FIELDS) {
					const value = input[key];
					if (value !== undefined && value !== '') body[key] = value;
				}
				return await json('/api/v1/accounts', { method: 'POST', body });
			} catch (err) {
				return tool.error(toMessage(err));
			}
		}
	);

	server.tool<typeof PostsInputSchema>(
		{
			name: 'aghara_posts',
			description:
				'Manage scheduled posts. Actions: list — list scheduled posts (optional status filter); create — schedule a new post with targets; publish_now — publish a queued post immediately; cancel — cancel a queued post; retry — re-queue a failed post at a new ISO time (runAt).',
			schema: PostsInputSchema
		},
		async (input) => {
			try {
				switch (input.action) {
					case 'list': {
						const qs = input.status ? `?status=${input.status}` : '';
						return await json(`/api/v1/posts${qs}`);
					}
					case 'create':
						return await json('/api/v1/posts', {
							method: 'POST',
							body: {
								body: input.body,
								mediaUrls: input.mediaUrls,
								targets: input.targets
							}
						});
					case 'publish_now':
						return await json(`/api/v1/posts/${input.scheduledId}/publish-now`, {
							method: 'POST'
						});
					case 'cancel':
						return await json(`/api/v1/scheduled/${input.scheduledId}`, {
							method: 'DELETE'
						});
					case 'retry':
						return await json(`/api/v1/scheduled/${input.scheduledId}/retry`, {
							method: 'POST',
							body: { runAt: input.runAt }
						});
				}
			} catch (err) {
				return tool.error(toMessage(err));
			}
		}
	);
}

function toMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Aghara API request failed';
}
