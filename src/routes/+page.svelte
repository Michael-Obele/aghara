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
		Globe,
		ListTree,
		RotateCcw,
		ShieldCheck,
		Check,
		Radio,
		Timer,
		Server,
		Code
	} from '@lucide/svelte/icons';
	import ComposeDemo from '$lib/components/blocks/ComposeDemo.svelte';
	import Reveal from '$lib/components/blocks/Reveal.svelte';
	import LiveTicker from '$lib/components/blocks/LiveTicker.svelte';
	import FanOut from '$lib/components/blocks/FanOut.svelte';
	import WeekRhythm from '$lib/components/blocks/WeekRhythm.svelte';
	import MorningTimeline from '$lib/components/blocks/MorningTimeline.svelte';

	// Smart defaults: annual billing pre-selected — the money-saving default.
	let billing = $state<'monthly' | 'annual'>('annual');

	const price = $derived.by(() => ({
		creator: billing === 'annual' ? 4 : 5,
		pro: billing === 'annual' ? 6 : 8
	}));

	const faqs = [
		{
			q: 'Which networks can I post to?',
			a: 'Bluesky is home base, plus Telegram, Discord, Mastodon, LinkedIn, and Threads if you want them. Only hook up what you use. The rest stays out of your way.'
		},
		{
			q: 'How does scheduling actually work?',
			a: 'Aghara checks your queue every minute and posts what is due. If a post fails, it retries 3 times, then leaves the live link. No babysitting.'
		},
		{
			q: 'Can I self-host instead?',
			a: 'Yep. Same app. One service plus one Postgres, set SELF_HOST=true, done. Most folks start hosted. Nothing to maintain.'
		},
		{
			q: 'How are my logins and tokens handled?',
			a: 'They stay encrypted with AES-256-GCM. We never log them. They never show in the API.'
		},
		{
			q: 'Can I automate it with code or agents?',
			a: 'Yep. The REST API does what the app does. List accounts, queue posts, publish now, cancel. One bearer token.'
		},
		{
			q: 'What does hosted cost?',
			a: 'Creator is $5/month monthly or $4/month annual ($48/year). Pro is $8/month monthly or $6/month annual ($72/year). Paystack handles billing, card required at checkout. There is no free tier. A paid plan is required to post. Cancel anytime.'
		}
	];

	// Honest comparison — verified Sept 2026 from public pricing pages, annual billing.
	// Buffer: $5/mo per channel (Essentials, 1 channel). Typefully: ~$12.50/mo per social set (Creator, annual).
	// Fedica Publish: $10/mo (100 queued). Fedica Grow: $19/mo annual ($29 monthly, 2,000 queued).
	// Hootsuite Standard: $99/user/mo. Aghara Creator: $4/mo flat, 5 accounts + 5,000 posts/mo. Pro: $6/mo flat, unlimited accounts + unlimited posts.
	const compare = [
		{
			name: 'Aghara Creator',
			price: '$4/mo',
			note: 'annual · flat',
			accounts: '5 accounts included',
			posts: '5,000 / month flat — all 5 included',
			highlight: true
		},
		{
			name: 'Aghara Pro',
			price: '$6/mo',
			note: 'annual · flat',
			accounts: 'unlimited accounts',
			posts: 'unlimited posts — no per-channel math',
			highlight: true
		},
		{
			name: 'Buffer Essentials',
			price: '$5/mo',
			note: 'annual · +$5 per extra channel',
			accounts: '1 included — 5 channels = $25/mo',
			posts: 'unlimited on 1 channel only',
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
	<title>Aghara — The town crier for the internet</title>
	<meta
		name="description"
		content="Aghara (ah-GAH-rah) is the town crier for the internet. Write once, and it is announced on Bluesky, Telegram, Discord, Mastodon, LinkedIn, and Threads, right on time. Try the live demo, no account needed."
	/>
</svelte:head>

<!-- Hero — the crier's promise: one voice, every square at once.
	Spacious by design: generous rhythm, one idea per beat, the fan-out visual
	does the explaining so the copy can stay short. -->
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
		class="mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-32"
	>
		<div>
			<div class="hero-rise mb-6 flex flex-wrap items-center gap-2" style="animation-delay:0ms">
				<Badge variant="secondary">Aghara · ah-GAH-rah · the town crier</Badge>
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
				class="hero-rise max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
				style="animation-delay:80ms"
			>
				The town crier <span class="text-primary">for the internet.</span>
			</h1>
			<p
				class="hero-rise mt-6 max-w-lg text-lg leading-relaxed text-pretty text-muted-foreground"
				style="animation-delay:160ms"
			>
				In Ibani-Ijaw villages, the Aghara took one message to every square. This one takes yours to
				Bluesky, Telegram, Discord, Mastodon, LinkedIn, and Threads, on time.
			</p>
			<div class="hero-rise mt-10 flex flex-wrap gap-4" style="animation-delay:240ms">
				<a href="/register">
					<Button
						size="lg"
						class="gap-2 shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
					>
						Start posting everywhere <ArrowRight class="size-4" />
					</Button>
				</a>
				<a href="/#story"><Button size="lg" variant="outline">Hear the story</Button></a>
			</div>
			<!-- Risk reducers: honest — demo needs no account, posting needs a plan -->
			<ul
				class="hero-rise mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground"
				style="animation-delay:320ms"
			>
				<li class="flex items-center gap-1.5">
					<Check class="size-4 shrink-0 text-primary" /> Demo below needs no account
				</li>
				<li class="flex items-center gap-1.5">
					<Check class="size-4 shrink-0 text-primary" /> Paid plan from $5/mo to post
				</li>
				<li class="flex items-center gap-1.5">
					<Check class="size-4 shrink-0 text-primary" /> Cancel anytime
				</li>
			</ul>
			<p class="hero-rise mt-4 text-sm text-muted-foreground" style="animation-delay:360ms">
				$4/mo Creator annual · $6/mo Pro annual. Hosted, no maintenance.
			</p>
		</div>
		<div class="hero-rise relative" style="animation-delay:200ms">
			<FanOut />
		</div>
	</div>
</section>

<!-- Sample queue ticker: what a busy morning looks like -->
<LiveTicker />

<!-- Story — where the name comes from, and why it matters -->
<section id="story" class="border-b">
	<div class="mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
		<div class="grid items-start gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
			<Reveal>
				<div class="lg:sticky lg:top-24">
					<p class="text-xs font-semibold tracking-widest text-primary uppercase">Why “Aghara”</p>
					<h2 class="mt-3 max-w-md text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
						One message, <span class="text-primary">every square.</span>
					</h2>
					<p class="mt-5 max-w-md leading-relaxed text-muted-foreground">
						Aghara (ah-GAH-rah) was the town crier. One message, every square, nobody missed out.
					</p>
					<p class="mt-4 max-w-md leading-relaxed text-muted-foreground">
						The internet has six squares too. Write once and Aghara does the rounds for you.
					</p>
					<div class="mt-8 flex flex-wrap gap-4">
						<a href="/register">
							<Button class="gap-2">
								Send your first announcement <ArrowRight class="size-4" />
							</Button>
						</a>
					</div>
				</div>
			</Reveal>
			<Reveal delay={120}>
				<MorningTimeline />
			</Reveal>
		</div>
	</div>
</section>

<!-- Try it — reciprocity + IKEA effect: the real flow before signing up -->
<section id="try" class="border-b bg-card/50">
	<div class="mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
		<div class="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
			<Reveal>
				<div>
					<p class="text-xs font-semibold tracking-widest text-primary uppercase">Live demo</p>
					<h2 class="mt-3 max-w-md text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
						You read step 1. <span class="text-primary">Now try it yourself.</span>
					</h2>
					<p class="mt-5 max-w-md leading-relaxed text-muted-foreground">
						This is the real compose box. Write something, pick your squares, set a time. No
						account, nothing saved.
					</p>
					<ul class="mt-8 space-y-3 text-sm text-muted-foreground">
						<li class="flex items-center gap-2.5">
							<Check class="size-4 shrink-0 text-primary" /> Your draft stays in this browser only
						</li>
						<li class="flex items-center gap-2.5">
							<Check class="size-4 shrink-0 text-primary" /> Bluesky first, six networks when you need
							them
						</li>
						<li class="flex items-center gap-2.5">
							<Check class="size-4 shrink-0 text-primary" /> Scheduling takes about 10 seconds
						</li>
					</ul>
				</div>
			</Reveal>
			<Reveal delay={120}>
				<ComposeDemo />
			</Reveal>
		</div>
	</div>
</section>

<!-- Rhythm — what a week of showing up looks like -->
<section id="rhythm" class="border-b">
	<div class="mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
		<div class="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
			<Reveal delay={120} class="order-2 lg:order-1">
				<WeekRhythm />
			</Reveal>
			<Reveal class="order-1 lg:order-2">
				<div>
					<p class="text-xs font-semibold tracking-widest text-primary uppercase">
						The quiet payoff
					</p>
					<h2 class="mt-3 max-w-md text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
						Stay visible <span class="text-primary">without living online.</span>
					</h2>
					<p class="mt-5 max-w-md leading-relaxed text-muted-foreground">
						The crier never performed. They just showed up where people already were. That is what a
						queue gives you. Presence built in spare minutes, not a second job.
					</p>
					<p class="mt-4 max-w-md leading-relaxed text-muted-foreground">
						Write five posts on Sunday night. Every square hears from you all week while you do the
						real work.
					</p>
				</div>
			</Reveal>
		</div>
	</div>
</section>

<!-- Stats band: plain-English outcomes, not spec labels -->
<section class="border-b">
	<div class="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-14 sm:py-16 lg:grid-cols-4">
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

<!-- How it works — the machinery behind "on time, everywhere" -->
<section id="how" class="border-b bg-card/50">
	<div class="mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
		<Reveal>
			<p class="text-center text-xs font-semibold tracking-widest text-primary uppercase">
				How it works
			</p>
			<h2
				class="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
			>
				You schedule it. <span class="text-primary">Aghara posts it.</span>
			</h2>
			<p class="mx-auto mt-4 max-w-xl text-center leading-relaxed text-muted-foreground">
				Ten seconds of writing in the demo. Aghara handles the timing and keeps the links.
			</p>
		</Reveal>
		<div class="relative mt-14 grid gap-6 md:grid-cols-3">
			<div
				aria-hidden="true"
				class="absolute top-11 right-[16%] left-[16%] hidden border-t-2 border-dashed border-primary/25 md:block"
			></div>
			<Reveal>
				<div class="relative rounded-xl border bg-background p-6 shadow-sm">
					<div class="flex items-center justify-between">
						<div
							class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
						>
							<CalendarClock class="size-5" />
						</div>
						<span
							class="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
							>Queued</span
						>
					</div>
					<h3 class="mt-4 font-semibold">09:00 means 09:00 where you are</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Your timezone saves when you write. Not sent yet? Edit the words or move the time.
					</p>
				</div>
			</Reveal>
			<Reveal delay={100}>
				<div class="relative rounded-xl border bg-background p-6 shadow-sm">
					<div class="flex items-center justify-between">
						<div
							class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
						>
							<Timer class="size-5" />
						</div>
						<span
							class="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
							>Automatic</span
						>
					</div>
					<h3 class="mt-4 font-semibold">Checked every minute, posted everywhere</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						Aghara checks your queue each minute and posts what is due. Long posts become threads
						where they can, parts in order elsewhere. A hiccup gets 3 retries.
					</p>
				</div>
			</Reveal>
			<Reveal delay={200}>
				<div class="relative rounded-xl border bg-background p-6 shadow-sm">
					<div class="flex items-center justify-between">
						<div
							class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
						>
							<Link2 class="size-5" />
						</div>
						<span class="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
							>Receipts</span
						>
					</div>
					<h3 class="mt-4 font-semibold">Live links waiting when you return</h3>
					<p class="mt-2 text-sm text-muted-foreground">
						The schedule page shows status, attempts, and links for each part. Failed? Pick a new
						time and retry.
					</p>
				</div>
			</Reveal>
		</div>
	</div>
</section>

<!-- Why Aghara — what the crier's promise rests on -->
<section id="features" class="border-b">
	<div class="mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
		<Reveal>
			<p class="text-center text-xs font-semibold tracking-widest text-primary uppercase">
				Why Aghara
			</p>
			<h2
				class="mx-auto mt-3 max-w-2xl text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
			>
				Write once. <span class="text-primary">Heard everywhere.</span>
			</h2>
			<p class="mx-auto mt-4 max-w-xl text-center leading-relaxed text-muted-foreground">
				No dashboard to live in. Hand over the message and get on with your day.
			</p>
		</Reveal>
		<div class="mt-14 grid gap-6 lg:grid-cols-6">
			<Reveal class="lg:col-span-4">
				<div class="h-full rounded-xl border bg-card p-6 sm:p-8">
					<div class="flex items-center gap-2 text-primary">
						<ListTree class="size-5" />
						<h3 class="font-semibold text-foreground">Long posts still land right</h3>
					</div>
					<p class="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
						Bluesky, Mastodon, and Threads get real reply threads. Telegram and Discord get each
						part in order. LinkedIn gets one post. Write long, it still lands.
					</p>
					<div aria-hidden="true" class="mt-6 max-w-md">
						<div class="flex gap-3">
							<div class="flex flex-col items-center">
								<span
									class="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
									>1</span
								>
								<span class="w-px flex-1 bg-border"></span>
							</div>
							<p class="pb-4 text-xs text-muted-foreground">Part 1 goes out first</p>
						</div>
						<div class="flex gap-3">
							<div class="flex flex-col items-center">
								<span
									class="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
									>2</span
								>
								<span class="w-px flex-1 bg-border"></span>
							</div>
							<p class="pb-4 text-xs text-muted-foreground">Part 2 follows as a reply</p>
						</div>
						<div class="flex gap-3">
							<div class="flex flex-col items-center">
								<span
									class="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
									>3</span
								>
							</div>
							<p class="text-xs text-muted-foreground">Part 3 lands last with the link</p>
						</div>
					</div>
				</div>
			</Reveal>
			<Reveal delay={80} class="lg:col-span-2">
				<div class="h-full rounded-xl border bg-card p-6">
					<div class="flex items-center gap-2 text-primary">
						<Globe class="size-5" />
						<h3 class="font-semibold text-foreground">Your time, your timezone</h3>
					</div>
					<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
						09:00 in Nairobi stays 09:00, even if you travel.
					</p>
					<p
						class="mt-5 inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium"
					>
						<Globe class="size-3.5 text-primary" /> Tue 09:00 · Africa/Nairobi
					</p>
				</div>
			</Reveal>
			<Reveal class="lg:col-span-2">
				<div class="h-full rounded-xl border bg-card p-6">
					<div class="flex items-center gap-2 text-primary">
						<ShieldCheck class="size-5" />
						<h3 class="font-semibold text-foreground">Your keys stay yours</h3>
					</div>
					<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
						Logins and tokens stay encrypted. Never logged, never in the API.
					</p>
				</div>
			</Reveal>
			<Reveal delay={80} class="lg:col-span-2">
				<div class="h-full rounded-xl border bg-card p-6">
					<div class="flex items-center gap-2 text-primary">
						<RotateCcw class="size-5" />
						<h3 class="font-semibold text-foreground">If it fails, you can retry</h3>
					</div>
					<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
						A hiccup gets 3 retries. The schedule page shows status, attempts, and links. Failed?
						Pick a new time.
					</p>
				</div>
			</Reveal>
			<Reveal delay={160} class="lg:col-span-2">
				<div class="h-full rounded-xl border bg-card p-6">
					<div class="flex items-center gap-2 text-primary">
						<Code class="size-5" />
						<h3 class="font-semibold text-foreground">Works with scripts and agents</h3>
					</div>
					<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
						The REST API does what the app does. Queue, publish now, cancel, retry. One bearer
						token.
					</p>
					<div class="mt-5 rounded-lg bg-muted/60 p-4 text-xs leading-relaxed">
						<p class="font-mono font-semibold">POST /api/v1/posts</p>
						<p class="mt-1 font-mono text-muted-foreground">Bearer aghara_… · queue · retry</p>
					</div>
				</div>
			</Reveal>
		</div>
	</div>
</section>

<!-- Compare — honest numbers, verified Sept 2026, annual billing -->
<section id="compare" class="border-b">
	<div class="mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
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
				Buffer $5/mo per channel ($30 for 6). Typefully ~$12.50 per set (~$75 for 6). Fedica $10
				(100 queued) / $19 Grow. Hootsuite $99/user. Aghara Creator $4 flat (5 accounts, 5,000
				posts). Pro $6 flat unlimited. Annual, Sept 2026. Prices move, check before you decide.
			</p>
		</Reveal>
	</div>
</section>

<!-- Pricing — Creator is the highlighted target, Pro anchors -->
<section id="pricing" class="border-b bg-card/50">
	<div class="mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
		<Reveal>
			<p class="text-center text-xs font-semibold tracking-widest text-primary uppercase">
				Pricing
			</p>
			<h2 class="mt-2 text-center text-3xl font-semibold tracking-tight text-balance">
				One flat price. <span class="text-primary">No channel math.</span>
			</h2>
			<p class="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
				Monthly or annual. Annual is cheaper for the same posts. Cancel anytime.
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
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />5 accounts, 5,000 posts / month
						</li>
						<li class="flex gap-2 text-muted-foreground">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />All 6 networks, retries and live
							links
						</li>
						<li class="flex gap-2 text-muted-foreground">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />API for scripts and agents
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
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />Unlimited accounts, unlimited
							posts
						</li>
						<li class="flex gap-2 text-muted-foreground">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />Everything in Creator, room to
							grow
						</li>
						<li class="flex gap-2 text-muted-foreground">
							<Check class="mt-0.5 size-4 shrink-0 text-primary" />API for scripts and agents
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
				Want to self-host? Same app, you run the server. Most start hosted.
			</p>
		</Reveal>
	</div>
</section>

<!-- FAQ — the stuff people actually ask before signing up -->
<section id="faq" class="border-b">
	<div class="mx-auto max-w-6xl px-6 py-24 sm:py-28 lg:py-32">
		<Reveal>
			<p class="text-center text-xs font-semibold tracking-widest text-primary uppercase">FAQ</p>
			<h2 class="mt-2 text-center text-3xl font-semibold tracking-tight text-balance">
				Quick answers, <span class="text-primary">no sales talk.</span>
			</h2>
			<p class="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
				What people ask before they register.
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
	<div class="relative mx-auto max-w-6xl px-6 py-24 text-center sm:py-28 lg:py-32">
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
				Create account, pick a plan, hook up Bluesky, schedule. Paid plan to post. Cancel anytime.
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
				Paid plan required to post · Cancel anytime · Live demo needs no account
			</p>
		</Reveal>
	</div>
</section>

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
