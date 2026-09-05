// Provider registry — one entry per channel. The publisher looks up by channel.
import * as bluesky from './bluesky';
import * as telegram from './telegram';
import * as discord from './discord';
import * as mastodon from './mastodon';
import * as linkedin from './linkedin';
import * as threads from './threads';

export interface Provider {
	channel: string;
	maxLength: number;
	verify: (creds: Record<string, unknown>) => Promise<void | Partial<Record<string, unknown>>>;
	publish: (
		input: { body: string; mediaUrls: string[] },
		creds: Record<string, unknown>
	) => Promise<{ url?: string }>;
}

export const providers: Record<string, Provider> = {
	bluesky: bluesky as unknown as Provider,
	telegram: telegram as unknown as Provider,
	discord: discord as unknown as Provider,
	mastodon: mastodon as unknown as Provider,
	linkedin: linkedin as unknown as Provider,
	threads: threads as unknown as Provider
};

export const channelNames: Record<string, string> = {
	bluesky: 'Bluesky',
	telegram: 'Telegram',
	discord: 'Discord',
	mastodon: 'Mastodon',
	linkedin: 'LinkedIn',
	threads: 'Threads'
};

export function getProvider(channel: string): Provider {
	const provider = providers[channel];
	if (!provider) throw new Error(`Unknown channel: ${channel}`);
	return provider;
}
