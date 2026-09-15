import type { User, Session } from 'better-auth';
import type { DeepResult, HealthSample, LivenessResult } from '$lib/server/services/health-watch';

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

	// Background-work state, kept on globalThis because Vite can instantiate
	// server modules more than once in dev — one shared object, one answer.
	var __aghara_scheduler_runtime:
		| {
				running: boolean;
				disabled: boolean;
				lastTickAt: number | null;
				/** When the next queued post is due; null = the queue is empty. */
				nextDueAt: number | null;
				pending: number;
				/** A mutation changed the queue; re-read the plan on the next tick. */
				scheduleDirty: boolean;
				lastSweepAt: number | null;
				lastResyncAt: number | null;
				lastHousekeepingAt: number | null;
				lastPruneAt: number | null;
				/** The tick the armed cron calls; reassigned on each module load. */
				tick: (() => Promise<void>) | null;
		  }
		| undefined;

	// The shared probe stream the status page renders (services/health-watch.ts).
	var __aghara_health_watch:
		| {
				samples: HealthSample[];
				buffered: HealthSample[];
				hydrated: boolean;
				last: LivenessResult | null;
				deep: DeepResult | null;
				lastFlushAt: number | null;
		  }
		| undefined;
}

export {};
