// Provider registry — one entry per channel. The publisher looks up by channel.
import type { Platform, PlatformInfo } from './types';
import { bluesky } from './bluesky';
import { telegram } from './telegram';
import { discord } from './discord';
import { mastodon } from './mastodon';
import { linkedin } from './linkedin';
import { threads } from './threads';

export const providers: Record<string, Platform> = {
	bluesky,
	telegram,
	discord,
	mastodon,
	linkedin,
	threads
};

export const channelNames: Record<string, string> = {
	bluesky: 'Bluesky',
	telegram: 'Telegram',
	discord: 'Discord',
	mastodon: 'Mastodon',
	linkedin: 'LinkedIn',
	threads: 'Threads'
};

export function getProvider(channel: string): Platform {
	const provider = providers[channel];
	if (!provider) throw new Error(`Unknown channel: ${channel}`);
	return provider;
}

/** Serializable capability matrix for the client (drives the compose UI). */
export function listPlatforms(): PlatformInfo[] {
	return Object.values(providers).map((p) => ({
		channel: p.channel,
		name: p.name,
		maxLength: p.maxLength,
		features: p.features
	}));
}
