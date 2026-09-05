<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { cn } from '$lib/utils.js';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$lib/components/ui/accordion/index.js';
	import {
		ArrowRight,
		Megaphone,
		CalendarClock,
		Link2,
		Zap,
		Infinity,
		ShieldCheck,
		Check,
		Send
	} from '@lucide/svelte/icons';
	import ThemeToggle from '$lib/components/blocks/ThemeToggle.svelte';
	import ComposeDemo from '$lib/components/blocks/ComposeDemo.svelte';

	// Smart defaults: annual billing pre-selected — the money-saving default.
	let billing = $state<'monthly' | 'annual'>('annual');

	const price = $derived.by(() => ({
		creator: billing === 'annual' ? 4 : 5,
		pro: billing === 'annual' ? 6 : 8
	}));

	const faqs = [
		{
			q: 'Which networks does Aghara support?',
			a: 'Bluesky is the core channel, with Telegram, Discord, Mastodon, LinkedIn and Threads as optional extras. Connect only what you use — unconnected networks stay hidden in the compose screen.'
		},
		{
			q: 'How does scheduling actually work?',
			a: 'A built-in scheduler checks every minute and publishes due posts on time. If a network is temporarily unreachable, Aghara retries up to 3 times, then hands you the live link when it succeeds.'
		},
		{
			q: 'Is self-hosting really free?',
			a: 'Yes. Set SELF_HOST=true and billing disappears entirely — unlimited accounts and posts, no card required. Aghara runs as one service with one Postgres and fits on a free Koyeb instance.'
		},
		{
			q: 'How are my network credentials protected?',
			a: 'Channel app-passwords and tokens are encrypted at rest with AES-256-GCM using your own APP_ENCRYPTION_KEY. Aghara never logs them, and they never appear in the API.'
		},
		{
			q: 'Can I automate with the API?',
			a: 'Yes. Every REST route is Bearer-token authenticated and mirrors the UI — list accounts, create posts, publish now, cancel scheduled. Perfect for scripts and AI agents.'
		},
		{
			q: 'What does it cost?',
			a: 'Hosted starts at $5/month (Creator) or $8/month (Pro), billed through Lemon Squeezy. Self-hosted is free forever. Cancel anytime.'
		}
	];
</script>

<svelte:head>
	<title>Aghara — Write once, announce on schedule</title>
	<meta
		name="description"
		content="Write once, Aghara announces on schedule. A Bluesky-first social scheduler that posts to every network you connect — free and unlimited when self-hosted."
	/>
</svelte:head>

<!-- Nav -->
<header class="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
	<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
		<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
			<span
				class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
			>
				<Megaphone class="size-4" />
			</span>
			Aghara
		</a>
		<nav class="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
			<a href="/#how" class="transition hover:text-foreground">How it works</a>
			<a href="/#features" class="transition hover:text-foreground">Features</a>
			<a href="/#pricing" class="transition hover:text-foreground">Pricing</a>
			<a href="/#faq" class="transition hover:text-foreground">FAQ</a>
		</nav>
		<div class="flex items-center gap-3">
			<ThemeToggle />
			<a href="/login"><Button variant="ghost">Sign in</Button></a>
			<a href="/register"><Button>Schedule your first post</Button></a>
		</div>
	</div>
</header>

<!-- Hero — reciprocity + IKEA effect: try the real flow before signing up -->
<section class="border-b">
	<div
		class="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:py-24"
	>
		<div>
			<Badge variant="secondary" class="mb-6">Bluesky-first · self-hostable</Badge>
			<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
				Write once. Aghara announces on schedule.
			</h1>
			<p class="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
				Stop copy-pasting between tabs. Compose one post, pick your networks and time, and Aghara
				delivers it — to Bluesky, Telegram, Discord, Mastodon, LinkedIn and Threads.
			</p>
			<div class="mt-8 flex flex-wrap gap-4">
				<a href="/register">
					<Button size="lg" class="gap-2">
						Schedule your first post <ArrowRight class="size-4" />
					</Button>
				</a>
				<a href="/#how"><Button size="lg" variant="outline">See how it works</Button></a>
			</div>
			<!-- Risk reducers + loss-aversion anchor: nothing to lose by starting -->
			<ul class="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
				<li class="flex items-center gap-1.5">
					<Check class="size-4 shrink-0 text-primary" /> No credit card to start
				</li>
				<li class="flex items-center gap-1.5">
					<Check class="size-4 shrink-0 text-primary" /> Cancel anytime
				</li>
				<li class="flex items-center gap-1.5">
					<Check class="size-4 shrink-0 text-primary" /> Self-host free forever
				</li>
			</ul>
			<p class="mt-4 text-sm text-muted-foreground">
				$5 Creator · $8 Pro — or free forever on your own server.
			</p>
		</div>
		<ComposeDemo />
	</div>
</section>

<!-- How it works -->
<section id="how" class="border-b bg-card/50">
	<div class="mx-auto max-w-6xl px-6 py-20">
		<h2 class="text-center text-3xl font-semibold tracking-tight">
			From draft to published in three steps
		</h2>
		<div class="mt-12 grid gap-6 md:grid-cols-3">
			<div class="rounded-xl border bg-background p-6">
				<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Send class="size-5" />
				</div>
				<h3 class="mt-4 font-semibold">1. Write once</h3>
				<p class="mt-2 text-sm text-muted-foreground">
					Compose your post in Aghara. One message, one place — no tab-hopping.
				</p>
			</div>
			<div class="rounded-xl border bg-background p-6">
				<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<CalendarClock class="size-5" />
				</div>
				<h3 class="mt-4 font-semibold">2. Pick channels &amp; time</h3>
				<p class="mt-2 text-sm text-muted-foreground">
					Choose which connected networks to announce to, and when each one goes out.
				</p>
			</div>
			<div class="rounded-xl border bg-background p-6">
				<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Megaphone class="size-5" />
				</div>
				<h3 class="mt-4 font-semibold">3. Aghara announces</h3>
				<p class="mt-2 text-sm text-muted-foreground">
					The built-in scheduler posts on time, retries failures up to 3 times, and hands you the
					live link.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Features -->
<section id="features" class="border-b">
	<div class="mx-auto max-w-6xl px-6 py-20">
		<h2 class="text-center text-3xl font-semibold tracking-tight">Built for one job, done well</h2>
		<div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			<div class="rounded-xl border p-6">
				<div class="flex items-center gap-2 text-primary">
					<Link2 class="size-5" />
					<h3 class="font-semibold">Multi-network</h3>
				</div>
				<p class="mt-2 text-sm text-muted-foreground">
					Six networks, one compose box. Connect what you use — the rest stay hidden.
				</p>
			</div>
			<div class="rounded-xl border p-6">
				<div class="flex items-center gap-2 text-primary">
					<CalendarClock class="size-5" />
					<h3 class="font-semibold">Schedule &amp; retry</h3>
				</div>
				<p class="mt-2 text-sm text-muted-foreground">
					Minute-accurate scheduling with automatic retries and graceful failure surfacing.
				</p>
			</div>
			<div class="rounded-xl border p-6">
				<div class="flex items-center gap-2 text-primary">
					<Zap class="size-5" />
					<h3 class="font-semibold">Small enough to matter</h3>
				</div>
				<p class="mt-2 text-sm text-muted-foreground">
					~100–200&nbsp;MB RAM, one service, one Postgres — no
					container fleet.
				</p>
			</div>
			<div class="rounded-xl border p-6">
				<div class="flex items-center gap-2 text-primary">
					<ShieldCheck class="size-5" />
					<h3 class="font-semibold">Credentials at rest, encrypted</h3>
				</div>
				<p class="mt-2 text-sm text-muted-foreground">
					Channel app-passwords and tokens are AES-256-GCM encrypted with your own key. We never log
					them.
				</p>
			</div>
			<div class="rounded-xl border p-6">
				<div class="flex items-center gap-2 text-primary">
					<Infinity class="size-5" />
					<h3 class="font-semibold">Free &amp; unlimited self-host</h3>
				</div>
				<p class="mt-2 text-sm text-muted-foreground">
					Set <code class="rounded bg-muted px-1 py-0.5 text-xs">SELF_HOST=true</code> and every limit
					disappears. Billing never touches your instance.
				</p>
			</div>
			<div class="rounded-xl border p-6">
				<div class="flex items-center gap-2 text-primary">
					<Megaphone class="size-5" />
					<h3 class="font-semibold">A real REST API</h3>
				</div>
				<p class="mt-2 text-sm text-muted-foreground">
					Bearer-token API for machines and integrations — list, create, publish-now, cancel.
					Perfect for agents.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Pricing — contrast effect: Pro anchors, Creator is the highlighted target -->
<section id="pricing" class="border-b bg-card/50">
	<div class="mx-auto max-w-6xl px-6 py-20">
		<h2 class="text-center text-3xl font-semibold tracking-tight">Simple pricing</h2>
		<p class="mt-3 text-center text-muted-foreground">
			Hosted plans with Lemon Squeezy as merchant of record. Self-hosted is free, forever.
		</p>

		<!-- Smart defaults: annual pre-selected — the money-saving default -->
		<div
			class="mx-auto mt-8 flex w-fit items-center gap-1 rounded-full border bg-background p-1 text-sm font-medium"
			role="group"
			aria-label="Billing period"
		>
			<button
				type="button"
				aria-pressed={billing === 'monthly'}
				onclick={() => (billing = 'monthly')}
				class="rounded-full px-4 py-1.5 transition"
				class:bg-primary={billing === 'monthly'}
				class:text-primary-foreground={billing === 'monthly'}
				class:text-muted-foreground={billing !== 'monthly'}
			>
				Monthly
			</button>
			<button
				type="button"
				aria-pressed={billing === 'annual'}
				onclick={() => (billing = 'annual')}
				class="rounded-full px-4 py-1.5 transition"
				class:bg-primary={billing === 'annual'}
				class:text-primary-foreground={billing === 'annual'}
				class:text-muted-foreground={billing !== 'annual'}
			>
				Annual
				<span
					class={cn(
						'ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
						billing === 'annual' ? 'bg-primary-foreground/20' : 'bg-primary/10 text-primary'
					)}
				>
					Save up to 25%
				</span>
			</button>
		</div>

		<div class="mt-10 grid gap-6 md:grid-cols-2">
			<div
				class="relative rounded-xl border-2 border-primary bg-background p-6 shadow-lg shadow-primary/10"
			>
				<Badge class="absolute -top-3 left-6">Most popular</Badge>
				<h3 class="font-semibold">Creator</h3>
				<p class="mt-2 text-4xl font-semibold tracking-tight">
					${price.creator}<span class="text-base font-normal text-muted-foreground">/mo</span>
				</p>
				{#if billing === 'annual'}
					<p class="mt-1 text-xs text-muted-foreground">
						${price.creator * 12} billed annually
					</p>
				{/if}
				<ul class="mt-6 space-y-2.5 text-sm">
					<li class="flex gap-2 text-muted-foreground">
						<Check class="mt-0.5 size-4 shrink-0 text-primary" />5 channel accounts
					</li>
					<li class="flex gap-2 text-muted-foreground">
						<Check class="mt-0.5 size-4 shrink-0 text-primary" />500 scheduled posts / month
					</li>
					<li class="flex gap-2 text-muted-foreground">
						<Check class="mt-0.5 size-4 shrink-0 text-primary" />API tokens for machines &amp;
						agents
					</li>
				</ul>
				<a href="/register" class="mt-8 block">
					<Button class="w-full">Choose Creator</Button>
				</a>
			</div>
			<div class="rounded-xl border bg-background p-6">
				<h3 class="font-semibold">Pro</h3>
				<p class="mt-2 text-4xl font-semibold tracking-tight">
					${price.pro}<span class="text-base font-normal text-muted-foreground">/mo</span>
				</p>
				{#if billing === 'annual'}
					<p class="mt-1 text-xs text-muted-foreground">${price.pro * 12} billed annually</p>
				{/if}
				<ul class="mt-6 space-y-2.5 text-sm">
					<li class="flex gap-2 text-muted-foreground">
						<Check class="mt-0.5 size-4 shrink-0 text-primary" />Unlimited channel accounts
					</li>
					<li class="flex gap-2 text-muted-foreground">
						<Check class="mt-0.5 size-4 shrink-0 text-primary" />2,000 scheduled posts / month
					</li>
					<li class="flex gap-2 text-muted-foreground">
						<Check class="mt-0.5 size-4 shrink-0 text-primary" />API tokens for machines &amp;
						agents
					</li>
				</ul>
				<a href="/register" class="mt-8 block">
					<Button class="w-full" variant="outline">Choose Pro</Button>
				</a>
			</div>
		</div>
		<!-- Loss aversion: self-host removes the limits entirely -->
		<p class="mt-8 text-center text-sm text-muted-foreground">
			Self-host Aghara and skip billing entirely — unlimited accounts and posts, no card required.
		</p>
	</div>
</section>

<!-- FAQ — answers objections before they stop a signup -->
<section id="faq" class="border-b">
	<div class="mx-auto max-w-6xl px-6 py-20">
		<h2 class="text-center text-3xl font-semibold tracking-tight">Questions, answered</h2>
		<p class="mt-3 text-center text-muted-foreground">
			Everything you need to know before you start scheduling.
		</p>
		<Accordion type="single" class="mx-auto mt-10 max-w-2xl">
			{#each faqs as faq (faq.q)}
				<AccordionItem value={faq.q}>
					<AccordionTrigger class="text-left font-medium">{faq.q}</AccordionTrigger>
					<AccordionContent class="text-sm text-muted-foreground">{faq.a}</AccordionContent>
				</AccordionItem>
			{/each}
		</Accordion>
	</div>
</section>

<!-- Final CTA — reciprocity done: time to commit -->
<section class="border-b bg-card/50">
	<div class="mx-auto max-w-6xl px-6 py-20 text-center">
		<h2 class="text-3xl font-semibold tracking-tight text-balance">
			Your next post is 30 seconds away.
		</h2>
		<p class="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
			Create a free account, connect Bluesky, and schedule your first post — before your coffee
			cools.
		</p>
		<div class="mt-8 flex flex-wrap items-center justify-center gap-4">
			<a href="/register">
				<Button size="lg" class="gap-2">
					Create your free account <ArrowRight class="size-4" />
				</Button>
			</a>
			<a href="/#pricing"><Button size="lg" variant="outline">See pricing</Button></a>
		</div>
		<p class="mt-6 text-sm text-muted-foreground">
			No credit card to start · Cancel anytime · Self-host free forever
		</p>
	</div>
</section>

<!-- Footer -->
<footer class="border-t">
	<div
		class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row"
	>
		<div class="flex items-center gap-2">
			<span
				class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
			>
				<Megaphone class="size-3.5" />
			</span>
			Aghara — the town crier for the internet
		</div>
		<div class="flex gap-6">
			<a href="/login" class="transition hover:text-foreground">Sign in</a>
			<a href="/register" class="transition hover:text-foreground">Get started</a>
		</div>
	</div>
</footer>
