<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import { browser, dev } from '$app/environment';
	import { Agentation, type AnnotationProps } from 'sv-agentation';

	let playgroundAnnotationProps: AnnotationProps = {
		toolbarPosition: 'bottom-left',
		outputMode: 'forensic',
		pauseAnimations: true,
		clearOnCopy: true,
		includeComponentContext: false,
		includeComputedStyles: false
	};

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<!-- Dark theme by default; users can switch (choice persists in localStorage). -->
<ModeWatcher defaultMode="dark" />
<Toaster />
{@render children()}

{#if browser && dev}
	<Agentation {...playgroundAnnotationProps} />
{/if}
