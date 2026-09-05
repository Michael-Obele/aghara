<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { myPlanQuery, startCheckoutCommand, isSelfHostQuery } from '$lib/remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { Check, Infinity, ArrowRight } from '@lucide/svelte/icons';

	const plan = myPlanQuery();
	const selfHost = isSelfHostQuery();

	let busy = $state<'creator' | 'pro' | null>(null);

	const tiers = [
		{
			id: 'creator',
			name: 'Creator',
			price: '$5',
			features: [
				'5 channel accounts',
				'500 scheduled posts / month',
				'API tokens for machines & agents'
			],
			cta: 'Choose Creator',
			popular: true
		},
		{
			id: 'pro',
			name: 'Pro',
			price: '$8',
			features: [
				'Unlimited channel accounts',
				'2,000 scheduled posts / month',
				'API tokens for machines & agents'
			],
			cta: 'Choose Pro'
		}
	];

	const currentPlan = $derived(plan.current?.plan);

	async function upgrade(variant: 'creator' | 'pro') {
		busy = variant;
		try {
			const { url } = await startCheckoutCommand({ variant });
			window.location.href = url;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Could not start checkout');
			busy = null;
		}
	}

	function tierAction(tierId: string) {
		if (currentPlan === tierId) return 'current';
		return 'upgrade';
	}
</script>

<svelte:head><title>Billing — Aghara</title></svelte:head>

<div class="space-y-8">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">
			{currentPlan === null ? 'Choose your plan' : 'Billing'}
		</h1>
		<p class="mt-1 text-muted-foreground">
			{currentPlan === null
				? 'A paid plan is required to use Aghara — pick one to get started.'
				: 'Payments handled by Lemon Squeezy — cancel anytime, no lock-in.'}
		</p>
	</div>

	{#if selfHost.current}
		<Card>
			<CardContent class="flex items-center gap-4 pt-6">
				<span
					class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
				>
					<Infinity class="size-5" />
				</span>
				<div>
					<p class="font-medium">Self-host mode</p>
					<p class="text-sm text-muted-foreground">
						Billing is disabled — unlimited accounts, posts, and API tokens. This instance is yours.
					</p>
				</div>
			</CardContent>
		</Card>
	{:else}
		<!-- Current plan summary -->
		<Card>
			<CardContent class="flex flex-wrap items-center justify-between gap-4 pt-6">
				<div>
					<p class="text-sm text-muted-foreground">Current plan</p>
					<p class="text-xl font-semibold capitalize">{currentPlan ?? 'No active plan'}</p>
				</div>
				{#if currentPlan === null}
					<a href="#plans"
						><Button class="gap-2">Choose a plan <ArrowRight class="size-4" /></Button></a
					>
				{:else}
					<Badge variant="secondary">Active</Badge>
				{/if}
			</CardContent>
		</Card>

		<!-- Contrast effect: Pro anchors the value of Creator -->
		<div id="plans" class="grid gap-6 md:grid-cols-2">
			{#each tiers as tier (tier.id)}
				<div
					class={tier.popular
						? 'relative rounded-xl border-2 border-primary bg-background p-6 shadow-lg shadow-primary/10'
						: 'rounded-xl border bg-background p-6'}
				>
					{#if tier.popular}
						<Badge class="absolute -top-3 left-6">Most popular</Badge>
					{/if}
					<h3 class="font-semibold">{tier.name}</h3>
					<p class="mt-2 text-4xl font-semibold tracking-tight">
						{tier.price}<span class="text-base font-normal text-muted-foreground">/mo</span>
					</p>
					<ul class="mt-6 space-y-2.5 text-sm">
						{#each tier.features as feature (feature)}
							<li class="flex gap-2 text-muted-foreground">
								<Check class="mt-0.5 size-4 shrink-0 text-primary" />
								{feature}
							</li>
						{/each}
					</ul>
					<div class="mt-8">
						{#if tierAction(tier.id) === 'current'}
							<Button class="w-full" disabled>Current plan</Button>
						{:else}
							<Button
								class="w-full"
								variant={tier.popular ? 'default' : 'outline'}
								disabled={busy === tier.id}
								onclick={() => upgrade(tier.id as 'creator' | 'pro')}
							>
								{tier.cta}
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Loss aversion: self-host removes limits entirely -->
		<p class="text-center text-sm text-muted-foreground">
			Prefer to own everything? Self-host Aghara (Docker image included) and every limit disappears
			— free forever.
		</p>
	{/if}
</div>
