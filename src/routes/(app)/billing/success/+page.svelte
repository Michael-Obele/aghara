<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { CheckCircle2, ArrowRight } from '@lucide/svelte/icons';
</script>

<svelte:head><title>Thank you — Aghara</title></svelte:head>

<div class="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
	<span class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
		<CheckCircle2 class="size-7" />
	</span>
	<h1 class="mt-6 text-2xl font-semibold tracking-tight">You're all set</h1>
	<p class="mt-3 text-muted-foreground">
		Your plan is being activated. It can take a minute or two for the webhook to arrive — refresh
		this page shortly to see your updated plan.
	</p>
	<a href="/dashboard" class="mt-8">
		<Button class="gap-2">Back to dashboard <ArrowRight class="size-4" /></Button>
	</a>
</div>
