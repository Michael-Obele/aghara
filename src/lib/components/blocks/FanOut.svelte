<script lang="ts">
	import type { Component } from 'svelte';
	import { Check } from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';
	import BlueskyIcon from '$lib/components/brand/BlueskyIcon.svelte';
	import TelegramIcon from '$lib/components/brand/TelegramIcon.svelte';
	import DiscordIcon from '$lib/components/brand/DiscordIcon.svelte';
	import MastodonIcon from '$lib/components/brand/MastodonIcon.svelte';
	import LinkedinIcon from '$lib/components/brand/LinkedinIcon.svelte';
	import ThreadsIcon from '$lib/components/brand/ThreadsIcon.svelte';

	interface Network {
		key: string;
		label: string;
		icon: Component;
		time: string;
	}

	// The crier at work: one draft fans out to six networks, one by one.
	// Times are illustrative — a quiet morning queue, not a metric claim.
	const networks: Network[] = [
		{ key: 'bluesky', label: 'Bluesky', icon: BlueskyIcon, time: '09:00' },
		{ key: 'telegram', label: 'Telegram', icon: TelegramIcon, time: '09:00' },
		{ key: 'discord', label: 'Discord', icon: DiscordIcon, time: '09:01' },
		{ key: 'mastodon', label: 'Mastodon', icon: MastodonIcon, time: '09:01' },
		{ key: 'linkedin', label: 'LinkedIn', icon: LinkedinIcon, time: '09:02' },
		{ key: 'threads', label: 'Threads', icon: ThreadsIcon, time: '09:02' }
	];

	let visible = $state(false);
	let announced = $state(0);

	const done = $derived(announced >= networks.length);
	const progress = $derived(Math.round((announced / networks.length) * 100));

	function fanout(node: HTMLElement) {
		if (typeof window === 'undefined') return;
		// Reduced motion: show the finished state immediately, no sequencing.
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			visible = true;
			announced = networks.length;
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						visible = true;
						observer.disconnect();
					}
				}
			},
			{ threshold: 0.3 }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}

	// Sequence the announcements once visible — one timeout at a time, cleaned up.
	$effect(() => {
		if (!visible) return;
		if (announced >= networks.length) return;
		const delay = announced === 0 ? 700 : 500;
		const t = setTimeout(() => {
			announced += 1;
		}, delay);
		return () => clearTimeout(t);
	});

	function statusOf(index: number): 'posted' | 'sending' | 'queued' {
		if (index < announced) return 'posted';
		if (index === announced && visible && !done) return 'sending';
		return 'queued';
	}
</script>

<div
	{@attach fanout}
	class="rounded-2xl border bg-card p-6 shadow-xl ring-1 shadow-primary/5 ring-border sm:p-8"
>
	<div class="flex items-start justify-between gap-4">
		<div>
			<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">One draft</p>
			<p class="mt-2 max-w-xs text-sm leading-relaxed">
				“We just shipped the new dashboard — full details on the blog, link in thread.”
			</p>
		</div>
		<span
			class="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
		>
			Tue 09:00
		</span>
	</div>

	<div
		class="my-6 flex items-center gap-3"
		role="status"
		aria-live="polite"
		aria-label={done ? 'All 6 networks announced' : `${announced} of 6 networks announced`}
	>
		<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
			<div
				class="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
				style:width={`${progress}%`}
			></div>
		</div>
		<p class="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
			{announced}/6 announced
		</p>
	</div>

	<ul class="space-y-2">
		{#each networks as network, i (network.key)}
			{@const status = statusOf(i)}
			<li
				class={cn(
					'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-all duration-500 motion-reduce:transition-none',
					status === 'posted' ? 'border-primary/60 bg-primary/5' : 'bg-card',
					visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
				)}
				style:transition-delay={visible ? `${i * 60}ms` : '0ms'}
				aria-label={`${network.label}: ${status}`}
			>
				<span
					class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
				>
					<network.icon class="size-4" />
				</span>
				<span class="font-medium">{network.label}</span>
				<span class="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
					{#if status === 'posted'}
						<span class="inline-flex items-center gap-1 font-medium text-primary">
							<Check class="size-3.5" /> Posted · {network.time}
						</span>
					{:else if status === 'sending'}
						<span class="font-medium text-foreground">Sending…</span>
					{:else}
						<span>Queued</span>
					{/if}
				</span>
			</li>
		{/each}
	</ul>

	<p class="mt-5 text-xs leading-relaxed text-muted-foreground">
		That is the whole job: Aghara checks your queue every minute, posts what is due, and retries up
		to 3 times if a network hiccups.
	</p>
</div>
