<script lang="ts">
	import { cn } from '$lib/utils.js';

	// A quiet week of showing up — illustrative rhythm, not a metric claim.
	// Bars rise when scrolled into view; reduced-motion shows the final state.
	const days = [
		{ day: 'Mon', posts: 3 },
		{ day: 'Tue', posts: 2 },
		{ day: 'Wed', posts: 4 },
		{ day: 'Thu', posts: 2 },
		{ day: 'Fri', posts: 3 },
		{ day: 'Sat', posts: 1 },
		{ day: 'Sun', posts: 2 }
	];

	const max = Math.max(...days.map((d) => d.posts));
	const total = days.reduce((sum, d) => sum + d.posts, 0);

	let visible = $state(false);

	function rhythm(node: HTMLElement) {
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
			{ threshold: 0.3 }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}
</script>

<div
	{@attach rhythm}
	class="rounded-2xl border bg-card p-6 shadow-xl ring-1 shadow-primary/5 ring-border sm:p-8"
>
	<div class="flex items-baseline justify-between gap-4">
		<div>
			<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				A quiet week
			</p>
			<p class="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
				{total} posts
				<span class="text-base font-normal text-muted-foreground">· example rhythm</span>
			</p>
		</div>
		<p class="shrink-0 text-xs text-muted-foreground">Mon – Sun</p>
	</div>

	<div
		class="mt-6 flex h-40 items-end gap-2 sm:gap-3"
		role="img"
		aria-label={`Example week: ${total} posts across 7 days, most on Wednesday with ${max} posts.`}
	>
		{#each days as d, i (d.day)}
			<div class="flex h-full flex-1 flex-col items-center justify-end gap-2">
				<div class="flex h-full w-full items-end rounded-lg bg-muted/60 px-1 pt-1 pb-0">
					<div
						class={cn(
							'w-full rounded-md transition-[height] duration-700 ease-out motion-reduce:transition-none',
							i === 2 ? 'bg-primary' : 'bg-primary/50'
						)}
						style:height={visible ? `${Math.max((d.posts / max) * 100, 8)}%` : '8%'}
						style:transition-delay={visible ? `${i * 70}ms` : '0ms'}
					></div>
				</div>
				<span class="text-[11px] font-medium text-muted-foreground">{d.day}</span>
			</div>
		{/each}
	</div>

	<p class="mt-5 text-xs leading-relaxed text-muted-foreground">
		No streaks, no babysitting. Write when you think of it, schedule it.
	</p>
</div>
