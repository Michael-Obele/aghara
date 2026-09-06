<script lang="ts">
	import BlueskyIcon from '$lib/components/brand/BlueskyIcon.svelte';
	import DiscordIcon from '$lib/components/brand/DiscordIcon.svelte';
	import LinkedinIcon from '$lib/components/brand/LinkedinIcon.svelte';
	import MastodonIcon from '$lib/components/brand/MastodonIcon.svelte';
	import TelegramIcon from '$lib/components/brand/TelegramIcon.svelte';
	import ThreadsIcon from '$lib/components/brand/ThreadsIcon.svelte';
	import { Check } from '@lucide/svelte/icons';
	import type { Component } from 'svelte';

	interface Tick {
		id: string;
		text: string;
		network: string;
		icon: Component;
		time: string;
	}

	const ticks: Tick[] = [
		{
			id: 't1',
			text: 'Launch notes are live — link in thread',
			network: 'Bluesky',
			icon: BlueskyIcon,
			time: '09:41'
		},
		{
			id: 't2',
			text: 'Office hours moved to Thursday',
			network: 'Discord',
			icon: DiscordIcon,
			time: '09:40'
		},
		{
			id: 't3',
			text: 'New dashboard walkthrough is up',
			network: 'LinkedIn',
			icon: LinkedinIcon,
			time: '09:35'
		},
		{
			id: 't4',
			text: 'Patch 1.4.2 rolling out now',
			network: 'Telegram',
			icon: TelegramIcon,
			time: '09:30'
		},
		{
			id: 't5',
			text: 'Weekend build log — 3 lessons',
			network: 'Mastodon',
			icon: MastodonIcon,
			time: '09:15'
		},
		{
			id: 't6',
			text: 'Behind the scenes from the studio',
			network: 'Threads',
			icon: ThreadsIcon,
			time: '09:00'
		}
	];

	// Duplicate for a seamless loop.
	const loop = [...ticks, ...ticks];
</script>

<div
	class="overflow-hidden border-y bg-card/50"
	role="region"
	aria-label="Sample of what a busy Aghara queue looks like"
>
	<div class="ticker-track flex w-max items-center gap-3 px-6 py-3">
		{#each loop as tick, i (tick.id + '-' + i)}
			<span
				class="inline-flex shrink-0 items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground"
			>
				<tick.icon class="size-3.5 text-primary" />
				<span class="max-w-56 truncate font-medium text-foreground">{tick.text}</span>
				<span class="hidden sm:inline">· {tick.network}</span>
				<span class="inline-flex items-center gap-1 text-primary">
					<Check class="size-3" />
					{tick.time}
				</span>
			</span>
		{/each}
	</div>
</div>

<style>
	.ticker-track {
		animation: ticker-scroll 36s linear infinite;
	}
	.ticker-track:hover {
		animation-play-state: paused;
	}
	@keyframes ticker-scroll {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-50%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ticker-track {
			animation: none;
			flex-wrap: wrap;
			width: auto;
		}
	}
</style>
