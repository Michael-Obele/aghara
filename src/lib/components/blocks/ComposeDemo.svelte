<script lang="ts">
	import { PersistedState } from 'runed';
	import type { Component } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import BlueskyIcon from '$lib/components/brand/BlueskyIcon.svelte';
	import DiscordIcon from '$lib/components/brand/DiscordIcon.svelte';
	import LinkedinIcon from '$lib/components/brand/LinkedinIcon.svelte';
	import ThreadsIcon from '$lib/components/brand/ThreadsIcon.svelte';
	import { Megaphone, Send, AtSign, CalendarClock, Check, ArrowRight } from '@lucide/svelte/icons';

	// Reciprocity + IKEA effect: visitors experience the real flow before signing up.
	// Smart defaults: never start blank — a real post and common networks are pre-selected,
	// and the draft persists across refreshes (runed PersistedState) so investment accumulates.
	const demoBody = new PersistedState(
		'aghara-demo-body',
		'We just shipped the new dashboard ✨\nFull details on the blog — link in thread.'
	);
	const demoNetworks = new PersistedState('aghara-demo-networks', [
		'bluesky',
		'discord',
		'linkedin'
	]);

	interface Network {
		key: string;
		label: string;
		icon: Component;
	}

	const networks: Network[] = [
		{ key: 'bluesky', label: 'Bluesky', icon: BlueskyIcon },
		{ key: 'telegram', label: 'Telegram', icon: Send },
		{ key: 'discord', label: 'Discord', icon: DiscordIcon },
		{ key: 'mastodon', label: 'Mastodon', icon: AtSign },
		{ key: 'linkedin', label: 'LinkedIn', icon: LinkedinIcon },
		{ key: 'threads', label: 'Threads', icon: ThreadsIcon }
	];

	// Smart default: one hour from now, rounded up to the next 5 minutes.
	function defaultRunAt(): string {
		const d = new Date(Date.now() + 60 * 60 * 1000);
		d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	let runAt = $state(defaultRunAt());
	let scheduled = $state(false);

	const hasBluesky = $derived(demoNetworks.current.includes('bluesky'));

	// Grapheme count — matches the real compose screen and Bluesky's 300-char limit.
	const graphemes = $derived.by(() => {
		try {
			return [
				...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(demoBody.current)
			].length;
		} catch {
			return [...demoBody.current].length;
		}
	});
	const overLimit = $derived(hasBluesky && graphemes > 300);

	const formattedTime = $derived.by(() => {
		try {
			return new Intl.DateTimeFormat(undefined, {
				weekday: 'short',
				hour: 'numeric',
				minute: '2-digit'
			}).format(new Date(runAt));
		} catch {
			return runAt;
		}
	});

	const networkLabel = $derived.by(() => {
		const names = demoNetworks.current.map(
			(key) => networks.find((n) => n.key === key)?.label ?? key
		);
		if (names.length === 0) return 'no networks';
		if (names.length === 1) return names[0];
		return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
	});

	function toggleNetwork(key: string) {
		const current = demoNetworks.current;
		demoNetworks.current = current.includes(key)
			? current.filter((k) => k !== key)
			: [...current, key];
	}

	function schedule() {
		if (overLimit) return;
		scheduled = true;
	}
</script>

<div
	class="rounded-xl border bg-card p-5 shadow-xl ring-1 shadow-primary/5 ring-border transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/10 sm:p-6"
>
	<div class="flex items-center justify-between gap-3">
		<div class="flex items-center gap-2">
			<span class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<Megaphone class="size-4" />
			</span>
			<div>
				<p class="flex items-center gap-2 text-sm font-semibold">
					Live demo
					<span class="relative flex size-2" aria-hidden="true">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none"
						></span>
						<span class="relative inline-flex size-2 rounded-full bg-primary"></span>
					</span>
				</p>
				<p class="text-xs text-muted-foreground">No account needed</p>
			</div>
		</div>
		{#if scheduled}
			<Badge variant="secondary" class="gap-1.5">
				<Check class="size-3.5 text-primary" /> Scheduled
			</Badge>
		{/if}
	</div>

	{#if scheduled}
		<div class="py-8 text-center">
			<span
				class="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
			>
				<Check class="size-6" />
			</span>
			<h3 class="mt-4 font-semibold">Nice — that is exactly how it works.</h3>
			<p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
				One post, out to {networkLabel} at {formattedTime}. Create your account, pick a plan, and
				you can do this for real — same box, same feel.
			</p>
			<div class="mt-6 flex flex-wrap items-center justify-center gap-3">
				<a href="/register">
					<Button class="gap-2">
						Create account, pick a plan <ArrowRight class="size-4" />
					</Button>
				</a>
				<Button variant="ghost" onclick={() => (scheduled = false)}>Tweak it first</Button>
			</div>
		</div>
	{:else}
		<div class="mt-4 space-y-4">
			<div class="space-y-2">
				<Label for="demo-body">Your post</Label>
				<Textarea
					id="demo-body"
					bind:value={demoBody.current}
					rows={4}
					placeholder="What do you want to announce?"
					class="resize-none"
				/>
				<p
					class="text-right text-xs"
					class:text-destructive={overLimit}
					class:text-muted-foreground={!overLimit}
				>
					{graphemes}{hasBluesky ? '/300' : ''} characters
				</p>
			</div>

			<div class="space-y-2">
				<p class="text-sm font-medium">Announce to</p>
				<div class="flex flex-wrap gap-2">
					{#each networks as network (network.key)}
						<button
							type="button"
							aria-pressed={demoNetworks.current.includes(network.key)}
							class={cn(
								'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
								demoNetworks.current.includes(network.key)
									? 'border-transparent bg-primary text-primary-foreground'
									: 'bg-background text-muted-foreground hover:text-foreground'
							)}
							onclick={() => toggleNetwork(network.key)}
						>
							<network.icon class="size-3.5" />
							{network.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="space-y-2">
				<Label for="demo-run-at" class="flex items-center gap-1.5">
					<CalendarClock class="size-3.5 text-muted-foreground" /> When
				</Label>
				<Input id="demo-run-at" type="datetime-local" bind:value={runAt} />
			</div>

			<Button class="w-full gap-2" disabled={overLimit} onclick={schedule}>
				Schedule it <ArrowRight class="size-4" />
			</Button>
			{#if overLimit}
				<p class="text-center text-xs text-destructive">
					Bluesky allows 300 characters — trim your post to continue.
				</p>
			{/if}
		</div>
	{/if}
</div>
