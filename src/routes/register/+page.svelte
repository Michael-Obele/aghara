<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUpForm } from '$lib/remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Megaphone, Check, ArrowRight } from '@lucide/svelte/icons';
</script>

<svelte:head>
	<title>Create your account — Aghara</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center px-6 py-12">
	<div class="w-full max-w-4xl">
		<!-- Goal gradient: show the path, never start at zero -->
		<ol class="mx-auto mb-8 flex max-w-md items-center justify-between text-xs">
			<li class="flex items-center gap-2 font-medium text-primary">
				<span
					class="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
					>1</span
				>
				Account
			</li>
			<li class="h-px flex-1 bg-border" aria-hidden="true"></li>
			<li class="flex items-center gap-2 text-muted-foreground">
				<span class="flex size-6 items-center justify-center rounded-full border">2</span>
				Connect
			</li>
			<li class="h-px flex-1 bg-border" aria-hidden="true"></li>
			<li class="flex items-center gap-2 text-muted-foreground">
				<span class="flex size-6 items-center justify-center rounded-full border">3</span>
				Announce
			</li>
		</ol>

		<div class="grid gap-8 md:grid-cols-2">
			<div class="hidden md:block">
				<div class="flex items-center gap-2 font-semibold tracking-tight">
					<span
						class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
					>
						<Megaphone class="size-4" />
					</span>
					Aghara
				</div>
				<h1 class="mt-6 text-3xl font-semibold tracking-tight">
					Your schedule is 30 seconds away.
				</h1>
				<p class="mt-3 text-muted-foreground">
					Create your account, connect Bluesky, and schedule your first post — before your coffee
					cools.
				</p>
				<ul class="mt-8 space-y-3 text-sm">
					<li class="flex gap-2 text-muted-foreground">
						<Check class="mt-0.5 size-4 shrink-0 text-primary" /> One post, six networks
					</li>
					<li class="flex gap-2 text-muted-foreground">
						<Check class="mt-0.5 size-4 shrink-0 text-primary" /> Minute-accurate scheduling
					</li>
					<li class="flex gap-2 text-muted-foreground">
						<Check class="mt-0.5 size-4 shrink-0 text-primary" /> From $5/month — cancel anytime
					</li>
				</ul>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Create your account</CardTitle>
					<CardDescription>Pick your plan after signup to start scheduling.</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						{...signUpForm.enhance(async (form) => {
							if ((await form.submit()) && form.result?.ok) {
								goto('/billing');
							}
						})}
						class="space-y-4"
					>
						<div class="space-y-2">
							<Label for="name">Name</Label>
							<Input
								{...signUpForm.fields.name.as('text')}
								id="name"
								placeholder="Your name"
								autocomplete="name"
							/>
						</div>
						<div class="space-y-2">
							<Label for="email">Email</Label>
							<Input
								{...signUpForm.fields.email.as('email')}
								id="email"
								placeholder="you@example.com"
								autocomplete="email"
							/>
						</div>
						<div class="space-y-2">
							<Label for="password">Password</Label>
							<Input
								{...signUpForm.fields.password.as('password')}
								id="password"
								placeholder="At least 8 characters"
								autocomplete="new-password"
							/>
						</div>
						{#if signUpForm.result && !signUpForm.result.ok}
							<p class="text-sm text-destructive" role="alert">{signUpForm.result.message}</p>
						{/if}
						<Button type="submit" class="w-full gap-2">
							Create my account <ArrowRight class="size-4" />
						</Button>
					</form>
					<p class="mt-4 text-center text-sm text-muted-foreground">
						Already have an account?
						<a href="/login" class="font-medium text-primary hover:underline">Sign in</a>
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
