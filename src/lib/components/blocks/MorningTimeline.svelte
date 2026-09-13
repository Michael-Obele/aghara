<script lang="ts">
	import { Megaphone, CalendarClock, Coffee } from '@lucide/svelte/icons';
	import { cn } from '$lib/utils.js';

	// Three beats of the same morning: before, during, after Aghara.
	// Times are illustrative — the shape of the story, not a metric claim.
	const beats = [
		{
			icon: Coffee,
			time: '08:55',
			title: 'You, with coffee',
			body: 'One thought worth sharing. You write it once in the compose box in the demo just below, then pick Tuesday 09:00.'
		},
		{
			icon: CalendarClock,
			time: '09:00',
			title: 'Aghara, on the minute',
			body: 'The queue is checked, your post is due, and it goes out to every network you picked. If one hiccups, it retries. You never see the hiccup.'
		},
		{
			icon: Megaphone,
			time: '09:02',
			title: 'Six timelines, one voice',
			body: 'Bluesky, Telegram, Discord, Mastodon, LinkedIn, Threads. The announcement lands everywhere at once, with the live links waiting for you.'
		}
	];

	let visible = $state(false);

	function timeline(node: HTMLElement) {
		if (typeof window === 'undefined') return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			visible = true;
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
			{ threshold: 0.2 }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}
</script>

<ol {@attach timeline} class="relative space-y-2">
	{#each beats as beat, i (beat.title)}
		<li
			class={cn(
				'relative grid gap-4 pb-10 pl-14 transition-all duration-700 last:pb-0 motion-reduce:transition-none sm:pl-16',
				visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
			)}
			style:transition-delay={visible ? `${i * 140}ms` : '0ms'}
		>
			{#if i < beats.length - 1}
				<span
					aria-hidden="true"
					class="absolute top-12 bottom-0 left-5.5 w-px bg-border sm:left-6.5"
				></span>
			{/if}
			<span
				aria-hidden="true"
				class="absolute top-0 left-0 flex size-11 items-center justify-center rounded-xl border bg-card text-primary shadow-sm sm:size-13"
			>
				<beat.icon class="size-5" />
			</span>
			<div>
				<p
					class="text-xs font-semibold tracking-widest text-muted-foreground uppercase tabular-nums"
				>
					{beat.time}
				</p>
				<h3 class="mt-1.5 text-lg font-semibold tracking-tight">{beat.title}</h3>
				<p class="mt-2 max-w-xl leading-relaxed text-muted-foreground">{beat.body}</p>
			</div>
		</li>
	{/each}
</ol>
