import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true),
		experimental: {
			// Enables `{#each await ...}` / `{await ...}` in templates (remote functions).
			async: true
		}
	},

	kit: {
		// adapter-node: single Node/Bun process for Koyeb + Fly.io (Docker).
		adapter: adapter(),
		experimental: {
			// Remote functions (query / form / command) from $app/server.
			remoteFunctions: true
		}
	}
};

export default config;
