import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		// layerchart ships raw .svelte sources — its dist re-exports
		// './X/X.svelte' through the "svelte" *export condition*, and it has no
		// top-level "svelte" field, so Vite can't auto-detect it the way it does
		// bits-ui. Without this it gets externalised and handed to Node, which
		// cannot execute .svelte, so every SSR render of a route importing it
		// fails with a 500.
		noExternal: ['layerchart']
	}
});
