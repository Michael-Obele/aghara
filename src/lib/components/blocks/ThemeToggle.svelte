<script lang="ts">
	import { toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button/index.js';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';

	let { variant = 'ghost' }: { variant?: 'ghost' | 'outline' | 'secondary' | 'default' } = $props();
</script>

<Button {variant} size="icon" onclick={toggleMode} aria-label="Toggle theme">
	<SunIcon class="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
	<MoonIcon class="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
</Button>
