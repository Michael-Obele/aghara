// Shared Valibot schema for connecting a channel account.
import * as v from 'valibot';

export const ConnectAccountSchema = v.variant('channel', [
	v.object({
		channel: v.literal('bluesky'),
		label: v.optional(v.string(), ''),
		handle: v.string(),
		appPassword: v.string()
	}),
	v.object({
		channel: v.literal('telegram'),
		label: v.optional(v.string(), ''),
		botToken: v.string(),
		chatId: v.string()
	}),
	v.object({
		channel: v.literal('discord'),
		label: v.optional(v.string(), ''),
		webhookUrl: v.pipe(v.string(), v.url())
	}),
	v.object({
		channel: v.literal('mastodon'),
		label: v.optional(v.string(), ''),
		instanceUrl: v.pipe(v.string(), v.url()),
		accessToken: v.string()
	}),
	v.object({
		channel: v.literal('linkedin'),
		label: v.optional(v.string(), ''),
		accessToken: v.string()
	}),
	v.object({
		channel: v.literal('threads'),
		label: v.optional(v.string(), ''),
		accessToken: v.string(),
		userId: v.string()
	})
]);

export type ConnectAccountInput = v.InferOutput<typeof ConnectAccountSchema>;
