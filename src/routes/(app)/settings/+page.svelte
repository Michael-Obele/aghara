<script lang="ts">
	import { page } from '$app/state';
	import { invalidate } from '$app/navigation';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Clock } from '@lucide/svelte/icons';
	import { setTimeFormatCookie, type TimeFormat } from '$lib/time';

	const timeFormat = $derived<TimeFormat>(page.data.timeFormat === '24h' ? '24h' : '12h');

	let switching = $state(false);

	async function toggle12h(checked: boolean) {
		if (switching) return;
		switching = true;
		try {
			setTimeFormatCookie(checked ? '12h' : '24h');
			await invalidate('app:time-format');
		} finally {
			switching = false;
		}
	}
</script>

<svelte:head><title>Settings — Aghara</title></svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
		<p class="mt-1 text-muted-foreground">Preferences that follow this browser.</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Clock class="size-4" /> Time format
			</CardTitle>
			<CardDescription>
				How Aghara shows times — e.g. 3:30 PM vs 15:30. Applies everywhere times are shown.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="flex items-center justify-between gap-4">
				<div class="space-y-1">
					<p class="text-sm font-medium">12-hour time</p>
					<p class="text-sm text-muted-foreground">
						{timeFormat === '12h' ? 'Showing 3:30 PM' : 'Showing 15:30'}
					</p>
				</div>
				<Switch
					checked={timeFormat === '12h'}
					disabled={switching}
					onCheckedChange={(c) => toggle12h(c)}
					aria-label="Use 12-hour time"
				/>
			</div>
		</CardContent>
	</Card>
</div>
