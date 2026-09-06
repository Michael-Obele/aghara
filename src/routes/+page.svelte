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
		Send,
		Radio,
		Timer,
		Server,
		Code
	} from '@lucide/svelte/icons';
	import ThemeToggle from '$lib/components/blocks/ThemeToggle.svelte';
	import ComposeDemo from '$lib/components/blocks/ComposeDemo.svelte';
	import Reveal from '$lib/components/blocks/Reveal.svelte';
	import LiveTicker from '$lib/components/blocks/LiveTicker.svelte';
	import BlueskyIcon from '$lib/components/brand/BlueskyIcon.svelte';
	import DiscordIcon from '$lib/components/brand/DiscordIcon.svelte';
	import LinkedinIcon from '$lib/components/brand/LinkedinIcon.svelte';
	import ThreadsIcon from '$lib/components/brand/ThreadsIcon.svelte';

	// Smart defaults: annual billing pre-selected — the money-saving default.
	let billing = $state<'monthly' | 'annual'>('annual');

	const price = $derived.by(() => ({
		creator: billing === 'annual' ? 4 : 5,
		pro: billing === 'annual' ? 6 : 8
	}));

	const faqs = [
		{
			q: 'Which networks can I post to?',
			a: 'Bluesky is home base, plus Telegram, Discord, Mastodon, LinkedIn, and Threads if you want them. Only hook up what you actually use — the rest stays out of your way when you write.'
		},
		{
			q: 'How does scheduling actually work?',
			a: 'Aghara checks your queue every minute and posts whatever is due. If a network hiccups, it retries up to 3 times, then drops you the live link. No babysitting.'
		},
		{
			q: 'Can I self-host instead?',
			a: 'Yep — same app, same features. One service plus one Postgres, set SELF_HOST=true, done. Most folks start hosted though, because there is nothing to maintain.'
		},
		{
			q: 'How are my logins and tokens handled?',
			a: 'They stay encrypted on your account with AES-256-GCM. We never log them, and they never show up in the API. Only you can use them to post.'
		},
		{
			q: 'Can I automate it with code or agents?',
			a: 'Yep. The REST API mirrors the app — list accounts, queue posts, publish now, cancel. Bearer-token auth, so scripts and agents slot right in.'
		},
		{
			q: 'What does hosted cost?',
			a: 'Creator is $5/month monthly or $4/month annual ($48/year). Pro is $8/month monthly or $6/month annual ($72/year). Lemon Squeezy handles billing, card required at checkout. There is no free tier — a paid plan is required to post. Cancel anytime.'
		}
	];

	// Honest comparison — verified Sept 2026 from public pricing pages, annual billing.
	// Buffer: $5/mo per channel (Essentials, 1 channel). Typefully: ~$12.50/mo per social set (Creator, annual).
	// Fedica Publish: $10/mo (100 queued). Fedica Grow: $19/mo annual ($29 monthly, 2,000 queued).
	// Hootsuite Standard: $99/user/mo. Aghara Creator: $4/mo flat, 5 accounts + 500 posts/mo.
	const compare = [
		{
			name: 'Aghara Creator',
			price: '$4/mo',
			note: 'annual · flat',
			accounts: '5 accounts included',
			posts: '500 posts / month',
			highlight: true
		},
		{
			name: 'Buffer Essentials',
			price: '$5/mo',
			note: 'annual · per channel',
			accounts: '1 channel, then +$5 each',
			posts: 'unlimited per channel',
			highlight: false
		},
		{
			name: 'Typefully Creator',
			price: '~$12.50/mo',
			note: 'annual · per social set',
			accounts: 'per-set pricing adds up fast',
			posts: '~1,000 posts / month',
			highlight: false
		},
		{
			name: 'Fedica Publish',
			price: '$10/mo',
			note: 'annual · analytics-led',
			accounts: '14 accounts, follower-capped',
			posts: '100 queued',
			highlight: false
		},
		{
			name: 'Hootsuite Standard',
			price: '$99/mo',
			note: 'annual · per user',
			accounts: '10 accounts, 1 seat',
			posts: 'unlimited posts',
			highlight: false
		}
	];
</script>

<svelte:head>
	<title>Aghara — Post once, show up everywhere</title>
	<meta
		name="description"
		content="Post once, show up everywhere. Aghara is the Bluesky-first scheduler for busy creators — one draft, six networks, posted on time. Try the live demo, no account needed."
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
			<a href="/#features" class="transition hover:text-foreground">Why Aghara</a>
			<a href="/#compare" class="transition hover:text-foreground">Compare</a>
			<a href="/#pricing" class="transition hover:text-foreground">Pricing</a>
			<a href="/#faq" class="transition hover:text-foreground">FAQ</a>
		</nav>
		<div class="flex items-center gap-3">
			<ThemeToggle />
			<a href="/login"><Button variant="ghost">Sign in</Button></a>
			<a href="/register"><Button>Post once, show up everywhere</Button></a>
		</div>
	</div>
</header>

<!-- Hero — reciprocity + IKEA effect: try the real flow before signing up -->
<section class="relative overflow-hidden border-b">
	<!-- Ambient solid-color rings (no gradients): quiet backdrop, one memorable shape -->
	<div aria-hidden="true" class="pointer-events-none absolute -top-28 -right-28 hidden sm:block">
		<div class="size-80 rounded-full border-2 border-primary/15"></div>
		<div
			class="absolute top-10 right-10 size-60 rounded-full border border-primary/10 bg-card/60"
		></div>
		<div
			class="absolute top-24 right-24 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
		>
			<Megaphone class="size-5" />
		</div>
	</div>
	<div
		class="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:py-24"
	>
		<div>
			<div class="hero-rise mb-6 flex flex-wrap items-center gap-2" style="animation-delay:0ms">
				<Badge variant="secondary">Bluesky-first · built for busy creators</Badge>
				<span
					class="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground"
				>
					<span class="relative flex size-2" aria-hidden="true">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none"
						></span>
						<span class="relative inline-flex size-2 rounded-full bg-primary"></span>
					</span>
					Checks your queue every minute
				</span>
			</div>
			<h1
				class="hero-rise text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
				style="animation-delay:80ms"
			>
				Post once, <span class="text-primary">show up everywhere.</span>
			</h1>
			<p
				class="hero-rise mt-5 max-w-xl text-lg text-pretty text-muted-foreground"
				style="animation-delay:160ms"
			>
				Tired of pasting the same thing into six tabs? Write it once in Aghara, pick your networks
				and a time — it goes out on Bluesky, Telegram, Discord, Mastodon, LinkedIn, and Threads
				while you get on with your day.
			</p>
			<div class="hero-rise mt-8 flex flex-wrap gap-4" style="animation-delay:240ms">
				<a href="/register">
					<Button
						size="lg"
						class="gap-2 shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
					>
						Start posting everywhere <ArrowRight class="size-4" />
					</Button>
				</a>
				<a href="/#how"><Button size="lg" variant="outline">See how it works</Button></a>
			</div>
			<!-- One post → six networks: real brand marks, no stock photos -->
			<div
				class="hero-rise mt-8 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
				style="animation-delay:320ms"
			>
				<span class="font-medium">One post →</span>
				<span
					class="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-medium text-foreground"
					><BlueskyIcon class="size-3.5 text-primary" /> Bluesky</span
				>
				<span
					class="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-medium text-foreground"
					><DiscordIcon class="size-3.5 text-primary" /> Discord</span
				>
				<span
					class="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-medium text-foreground"
					><LinkedinIcon class="size-3.5 text-primary" /> LinkedIn</span
				>
				<span
					class="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 font-medium text-foreground"
					><ThreadsIcon class="size-3.5 text-primary" /> Threads</span
				>
				<span class="font-medium">+2 more</span>
			</div>
			<!-- Risk reducers: honest — demo needs no account, posting needs a plan -->
			<ul
				class="hero-rise mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"
				style="animation-delay:380ms"
			>
				<li class="flex items-center gap-1.5">
					<Check class="size-4 shrink-0 text-primary" /> Demo above needs no account
				</li>
				<li class="flex items-center gap-1.5">
					<Check class="size-4 shrink-0 text-primary" /> Paid plan from $5/mo to post
				</li>
				<li class="flex items-center gap-1.5">
					<Check class="size-4 shrink-0 text-primary" /> Cancel anytime
				</li>
			</ul>
			<p class="hero-rise mt-4 text-sm text-muted-foreground" style="animation-delay:420ms">
				$4/mo Creator annual · $6/mo Pro annual — hosted, no maintenance.
			</p>
		</div>
		<div class="hero-rise relative" style="animation-delay:200ms">
			<ComposeDemo />
			<!-- Floating proof cards: product alive, not a static mock -->
			<div
				aria-hidden="true"
				class="float-soft absolute -top-5 -right-3 hidden items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs shadow-lg md:inline-flex"
			>
				<span
					class="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary"
					><Check class="size-3.5" /></span
				>
				<span
					><strong class="font-semibold">Published</strong>
					<span class="text-muted-foreground">· 3 networks · 09:41</span></span
				>
			</div>
			<div
				aria-hidden="true"
				class="float-soft absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-xl border bg-background px-3 py-2 text-xs shadow-lg md:inline-flex"
				style="animation-delay:1.2s"
			>
				<span
					class="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary"
					><Timer class="size-3.5" /></span
				>
				<span
					><strong class="font-semibold">Next up</strong>
					<span class="text-muted-foreground">· in 12 min · 2 networks</span></span
				>
			</div>
		</div>
	</div>
</section>

<!-- Sample queue ticker: what a busy morning looks like -->
<LiveTicker />

<!-- Stats band: plain-English outcomes, not spec labels -->
<section class="border-b">
	<div class="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 lg:grid-cols-4">
		<Reveal>
			<div class="flex items-center gap-3">
				<span
					class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
					><Radio class="size-5" /></span
				>
				<div>
					<p class="text-xl font-semibold tracking-tight">6 networks</p>
					<p class="text-xs text-muted-foreground">one draft, done</p>
				</div>
			</div>
		</Reveal>
		<Reveal delay={80}>
			<div class="flex items-center gap-3">
				<span
					class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
					><Timer class="size-5" /></span
				>
				<div>
					<p class="text-xl font-semibold tracking-tight">Every minute</p>
					<p class="text-xs text-muted-foreground">your queue gets checked</p>
				</div>
			</div>
		</Reveal>
		<Reveal delay={160}>
			<div class="flex items-center gap-3">
				<span
					class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
					><ShieldCheck class="size-5" /></span
				>
				<div>
					<p class="text-xl font-semibold tracking-tight">3 retries</p>
					<p class="text-xs text-muted-foreground">then you get the link</p>
				</div>
			</div>
		</Reveal>
		<Reveal delay={240}>
			<div class="flex items-center gap-3">
				<span
					class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
					><Server class="size-5" /></span
				>
				<div>
					<p class="text-xl font-semibold tracking-tight">Nothing to run</p>
					<p class="text-xs text-muted-foreground">hosted, we handle it</p>
				</div>
			</div>
		</Reveal>
	</div>
</section>

<!-- How it works — you are already 1 step in -->
<section id="how" class="border-b bg-card/50">
	<div class="mx-auto max-w-6xl px-6 py-20">
		<Reveal>
			<p class="text-center text-xs font-semibold tracking-widest text-primary uppercase">
				How it works
			</p>
			<h2 class="mt-2 text-center text-3xl font-semibold tracking-tight text-balance">
				You just did step 1 <span class="text-primary">up there.</span>
			</h2>
			<p class="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
				That demo is the real flow. Two more tiny steps and your posts go out on their own.
			</p>
		</Reveal>
		<div class="relative mt-12 grid gap-6 md:grid-cols-3">
			<div
				aria-hidden="true"
				class="absolute top-11 right-[16%] left-[16%] hidden border-t-2 border-dashed border-primary/25 md:block"
			></div>
			<Reveal>
				<div
					class="group relative rounded-xl border bg-background p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
				>
					<div class="flex items-center justify-between">
						<div
							class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"
						>
							<Send class="size-5" />
						</div>
						<span
							class="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
							>Step 1</span
						>
					</div>
					<h3 class="mt-4 font-semibold">Write it once</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						One draft, one place. You already tried this in the demo — same box, same feel.
					</p>
				</div>
			</Reveal>
			<Reveal delay={100}>
				<div
					class="group relative rounded-xl border bg-background p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
				>
					<div class="flex items-center justify-between">
						<div
							class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"
						>
							<CalendarClock class="size-5" />
						</div>
						<span
							class="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
							>Step 2</span
						>
					</div>
					<h3 class="mt-4 font-semibold">Pick where + when</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Tick the networks you actually use, pick a time. Done in about 10 seconds.
					</p>
				</div>
			</Reveal>
			<Reveal delay={200}>
				<div
					class="group relative rounded-xl border bg-background p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
				>
					<div class="flex items-center justify-between">
						<div
							class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"
						>
							<Megaphone class="size-5" />
						</div>
						<span class="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
							>Automatic</span
						>
					</div>
					<h3 class="mt-4 font-semibold">Go live your life</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Aghara posts on time, retries up to 3 times if a network hiccups, and drops you the live
						link. That is the whole job.
					</p>
				</div>
			</Reveal>
		</div>
	</div>
</section>

<!-- Features — the stuff that actually matters day to day -->
<section id="features" class="border-b">
	<div class="mx-auto max-w-6xl px-6 py-20">
		<Reveal>
			<p class="text-center text-xs font-semibold tracking-widest text-primary uppercase">
				Why Aghara
			</p>
			<h2 class="mt-2 text-center text-3xl font-semibold tracking-tight text-balance">
				Less dashboard, <span class="text-primary">more done.</span>
			</h2>
			<p class="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
				No analytics rabbit holes. No 40-tab workspace. Just the posting part, handled.
			</p>
		</Reveal>
		<div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			<Reveal>
				<div
					class="h-full rounded-xl border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
				>
					<div class="flex items-center gap-2 text-primary">
						<Link2 class="size-5" />
						<h3 class="font-semibold text-foreground">One draft, six networks</h3>
					</div>
					<p class="mt-2 text-sm text-muted-foreground">
						Bluesky first, plus the rest when you need them. Unused networks stay hidden so the box
						stays calm.
					</p>
				</div>
			</Reveal>
			<Reveal delay={80}>
				<div
					class="h-full rounded-xl border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
				>
					<div class="flex items-center gap-2 text-primary">
						<CalendarClock class="size-5" />
						<h3 class="font-semibold text-foreground">Posts on time, retries itself</h3>
					</div>
					<p class="mt-2 text-sm text-muted-foreground">
						Checked every minute. If a network hiccups, Aghara retries 3 times and hands you the
						link. You do not chase failures.
					</p>
				</div>
			</Reveal>
			<Reveal delay={160}>
				<div
					class="h-full rounded-xl border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
				>
					<div class="flex items-center gap-2 text-primary">
						<Zap class="size-5" />
						<h3 class="font-semibold text-foreground">Lightweight by design</h3>
					</div>
					<p class="mt-2 text-sm text-muted-foreground">
						One service, one database. Fast pages, no bloat, no “platform” to learn.
					</p>
				</div>
			</Reveal>
			<Reveal>
				<div
					class="h-full rounded-xl border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
				>
					<div class="flex items-center gap-2 text-primary">
						<ShieldCheck class="size-5" />
						<h3 class="font-semibold text-foreground">Your keys stay yours</h3>
					</div>
					<p class="mt-2 text-sm text-muted-foreground">
						Logins and tokens stay encrypted. Never logged, never in the API. Only used to post for
						you.
					</p>
				</div>
			</Reveal>
			<Reveal delay={80}>
				<div
					class="h-full rounded-xl border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
				>
					<div class="flex items-center gap-2 text-primary">
						<Code class="size-5" />
						<h3 class="font-semibold text-foreground">Plays nice with scripts + agents</h3>
					</div>
					<p class="mt-2 text-sm text-muted-foreground">
						REST API mirrors the app — queue, publish now, cancel. Bearer token, done.
					</p>
				</div>
			</Reveal>
			<Reveal delay={160}>
				<div
					class="h-full rounded-xl border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10"
				>
					<div class="flex items-center gap-2 text-primary">
						<Infinity class="size-5" />
						<h3 class="font-semibold text-foreground">Flat pricing, no per-channel math</h3>
					</div>
					<p class="mt-2 text-sm text-muted-foreground">
						5 accounts and 500 posts on Creator. No counting channels, no surprise tiers.
					</p>
				</div>
			</Reveal>
		</div>
	</div>
</section>

<!-- Compare — honest numbers, verified Sept 2026, annual billing -->
<section id="compare" class="border-b">
	<div class="mx-auto max-w-6xl px-6 py-20">
		<Reveal>
			<p class="text-center text-xs font-semibold tracking-widest text-primary uppercase">
				Compare
			</p>
			<h2 class="mt-2 text-center text-3xl font-semibold tracking-tight text-balance">
				What posting everywhere <span class="text-primary">actually costs.</span>
			</h2>
			<p class="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
				Same idea everywhere: a handful of accounts, posting regularly. Annual billing, public
				pricing, checked September 2026.
			</p>
		</Reveal>
		<Reveal delay={120}>
			<div class="mx-auto mt-10 max-w-3xl overflow-hidden rounded-xl border bg-card">
				<div
					class="grid grid-cols-[1.2fr_0.8fr_1fr] gap-2 border-b bg-muted/50 px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:grid-cols-[1.2fr_0.7fr_1fr_1fr] sm:px-6"
				>
					<span>Tool</span>
					<span>Starts at</span>
					<span class="hidden sm:block">Accounts</span>
					<span class="text-right sm:text-left">Posting limit</span>
				</div>
				{#each compare as row (row.name)}
					<div
						class={cn(
							'grid grid-cols-[1.2fr_0.8fr_1fr] items-center gap-2 border-b px-4 py-3.5 text-sm last:border-0 sm:grid-cols-[1.2fr_0.7fr_1fr_1fr] sm:px-6',
							row.highlight && 'bg-primary/5'
						)}
					>
						<div>
							<p class="font-semibold">
								{row.name}
								{#if row.highlight}
									<Badge variant="secondary" class="ml-2 align-middle">You are here</Badge>
								{/if}
							</p>
							<p class="text-xs text-muted-foreground">{row.note}</p>
						</div>
						<p class="font-semibold">{row.price}</p>
						<p class="text-muted-foreground">{row.accounts}</p>
						<p class="text-muted-foreground sm:text-sm">{row.posts}</p>
					</div>
				{/each}
			</div>
		</Reveal>
		<Reveal delay={160}>
			<p class="mx-auto mt-6 max-w-2xl text-center text-xs text-muted-foreground">
				Buffer Essentials is $5/mo per channel annual — 6 channels ≈ $30/mo. Typefully Creator is
				~$12.50/mo per social set annual — 6 sets ≈ $75/mo. Fedica Publish is $10/mo annual (100
				queued) and Grow is $19/mo annual. Hootsuite Standard is $99/user/mo annual. Aghara Creator
				is $4/mo flat annual — 5 accounts, 500 posts. Prices move; check their pages before you
				decide.
			</p>
		</Reveal>
	</div>
</section>

<!-- Pricing — Creator is the highlighted target, Pro anchors -->
<section id="pricing" class="border-b bg-card/50">
	<div class="mx-auto max-w-6xl px-6 py-20">
		<Reveal>
			<p class="text-center text-xs font-semibold tracking-widest text-primary uppercase">
				Pricing
			</p>
			<h2 class="mt-2 text-center text-3xl font-semibold tracking-tight text-balance">
				One flat price. <span class="text-primary">No channel math.</span>
			</h2>
			<p class="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
				Pick monthly or annual. Annual is cheaper — monthly just costs you more for the same posts.
				Cancel anytime.
			</p>
		</Reveal>

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
				class={cn(
					'rounded-full px-4 py-1.5 transition',
					billing === 'monthly'
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				Monthly
			</button>
			<button
				type="button"
				aria-pressed={billing === 'annual'}
				onclick={() => (billing = 'annual')}
				class={cn(
					'relative rounded-full px-4 py-1.5 transition',
					billing === 'annual'
						? 'bg-primary text-primary-foreground'
						: 'text-muted-foreground hover:text-foreground'
				)}
			>
				Annual
				<span
					class={cn(
						'absolute -top-3 -right-8 rotate-12 rounded-full px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-sm',
						billing === 'annual'
							? 'bg-primary-foreground text-primary'
							: 'bg-primary text-primary-foreground'
					)}
				>
					Save 25%
				</span>
			</button>
		</div>

		<div class="mt-10 grid items-stretch gap-6 md:grid-cols-2">
			<Reveal class="h-full">
				<div
					class="relative h-full rounded-xl border-2 border-primary bg-background p-6 shadow-lg shadow-primary/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/15"
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
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />5 accounts, 500 posts / month
						</li>
						<li class="flex gap-2 text-muted-foreground">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />All 6 networks, retries + live
							links
						</li>
						<li class="flex gap-2 text-muted-foreground">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />API for scripts &amp; agents
						</li>
					</ul>
					<a href="/register" class="mt-8 block">
						<Button class="w-full">Start with Creator</Button>
					</a>
				</div>
			</Reveal>
			<Reveal delay={120} class="h-full">
				<div
					class="h-full rounded-xl border bg-background p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
				>
					<h3 class="font-semibold">Pro</h3>
					<p class="mt-2 text-4xl font-semibold tracking-tight">
						${price.pro}<span class="text-base font-normal text-muted-foreground">/mo</span>
					</p>
					{#if billing === 'annual'}
						<p class="mt-1 text-xs text-muted-foreground">${price.pro * 12} billed annually</p>
					{/if}
					<ul class="mt-6 space-y-2.5 text-sm">
						<li class="flex gap-2 text-muted-foreground">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />Unlimited accounts, 2,000 posts /
							month
						</li>
						<li class="flex gap-2 text-muted-foreground">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />Everything in Creator, room to
							grow
						</li>
						<li class="flex gap-2 text-muted-foreground">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />API for scripts &amp; agents
						</li>
					</ul>
					<a href="/register" class="mt-8 block">
						<Button class="w-full" variant="outline">Go Pro when you are posting a lot</Button>
					</a>
				</div>
			</Reveal>
		</div>
		<!-- Footnote, not a third path: hosted is the default -->
		<Reveal>
			<p class="mx-auto mt-8 max-w-xl text-center text-xs text-muted-foreground">
				Prefer to run it yourself? Self-hosting is available — same app, you handle the server. Most
				folks start hosted.
			</p>
		</Reveal>
	</div>
</section>

<!-- FAQ — the stuff people actually ask before signing up -->
<section id="faq" class="border-b">
	<div class="mx-auto max-w-6xl px-6 py-20">
		<Reveal>
			<p class="text-center text-xs font-semibold tracking-widest text-primary uppercase">FAQ</p>
			<h2 class="mt-2 text-center text-3xl font-semibold tracking-tight text-balance">
				Quick answers, <span class="text-primary">no sales talk.</span>
			</h2>
			<p class="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
				The short version of everything people ask before they hit register.
			</p>
		</Reveal>
		<Reveal delay={120}>
			<Accordion type="single" class="mx-auto mt-10 max-w-2xl">
				{#each faqs as faq (faq.q)}
					<AccordionItem value={faq.q}>
						<AccordionTrigger class="text-left font-medium">{faq.q}</AccordionTrigger>
						<AccordionContent class="text-sm text-muted-foreground">{faq.a}</AccordionContent>
					</AccordionItem>
				{/each}
			</Accordion>
		</Reveal>
	</div>
</section>

<!-- Final CTA — you already know how it works -->
<section class="relative overflow-hidden border-b bg-card/50">
	<div
		aria-hidden="true"
		class="pointer-events-none absolute -bottom-24 -left-24 hidden size-72 rounded-full border-2 border-primary/15 sm:block"
	></div>
	<div class="relative mx-auto max-w-6xl px-6 py-20 text-center">
		<Reveal>
			<span
				class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
			>
				<Megaphone class="size-5" />
			</span>
			<h2 class="mx-auto mt-6 max-w-xl text-3xl font-semibold tracking-tight text-balance">
				Set up once, <span class="text-primary">post for months.</span>
			</h2>
			<p class="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
				Create your account, pick a plan, hook up Bluesky, schedule your first post. Paid plan
				required to post — cancel anytime.
			</p>
			<div class="mt-8 flex flex-wrap items-center justify-center gap-4">
				<a href="/register">
					<Button
						size="lg"
						class="gap-2 shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
					>
						Start posting everywhere <ArrowRight class="size-4" />
					</Button>
				</a>
				<a href="/#pricing"><Button size="lg" variant="outline">See pricing</Button></a>
			</div>
			<p class="mt-6 text-sm text-muted-foreground">
				Paid plan required to post · Cancel anytime · Demo above needs no account
			</p>
		</Reveal>
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
			<a href="/register" class="transition hover:text-foreground">Start posting everywhere</a>
		</div>
	</div>
</footer>

<style>
	/* Entrance motion: staggered rise, one orchestrated moment (respects reduced motion) */
	.hero-rise {
		opacity: 0;
		animation: hero-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}
	@keyframes hero-rise {
		from {
			opacity: 0;
			transform: translateY(18px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	/* Ambient float for proof cards: quiet, 5s loop */
	.float-soft {
		animation: float-soft 5s ease-in-out infinite;
	}
	@keyframes float-soft {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.hero-rise,
		.float-soft {
			opacity: 1;
			animation: none;
			transform: none;
		}
	}
</style>
