<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<main class="flex-1 px-4 py-8 md:px-8">
	<div class="mx-auto max-w-5xl">{@render children()}</div>
</main>
