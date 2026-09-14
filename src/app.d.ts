import type { User, Session } from 'better-auth';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
		}

		// interface Error {}
		interface PageData {
			timeFormat: '12h' | '24h';
		}
		// interface PageState {}
		// interface Platform {}
	}

	var __aghara_scheduler_runtime: { running: boolean; lastTickAt: number | null } | undefined;
}

export {};
