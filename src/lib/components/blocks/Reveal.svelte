<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		delay = 0,
		y = 16,
		class: className = ''
	}: { children: Snippet; delay?: number; y?: number; class?: string } = $props();

	let visible = $state(false);

	function reveal(node: HTMLElement) {
		// Reduced-motion: show immediately, no animation.
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
			{ threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}
</script>

<div
	{@attach reveal}
	class={className}
	style:--reveal-delay={`${delay}ms`}
	style:--reveal-y={`${y}px`}
	class:reveal-visible={visible}
	class:reveal-hidden={!visible}
>
	{@render children()}
</div>

<style>
	.reveal-hidden {
		opacity: 0;
		transform: translateY(var(--reveal-y));
	}
	.reveal-visible {
		opacity: 1;
		transform: translateY(0);
		transition:
			opacity 0.6s ease,
			transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
		transition-delay: var(--reveal-delay);
	}
	@media (prefers-reduced-motion: reduce) {
		.reveal-hidden,
		.reveal-visible {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
