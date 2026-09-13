<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { signInForm } from '$lib/remote';
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
	import PasswordInput from '$lib/components/blocks/PasswordInput.svelte';
	import { Megaphone, ArrowRight, LoaderCircle } from '@lucide/svelte/icons';
</script>

<svelte:head>
	<title>Sign in — Aghara</title>
</svelte:head>

<div class="flex min-h-svh items-center justify-center px-6 py-12">
	<div class="w-full max-w-md">
		<div class="mb-8 flex flex-col items-center text-center">
			<span
				class="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
			>
				<Megaphone class="size-6" />
			</span>
			<h1 class="mt-4 text-2xl font-semibold tracking-tight">Welcome back</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Your scheduled posts are waiting — sign in to keep them on time.
			</p>
		</div>
		<Card>
			<CardHeader>
				<CardTitle>Sign in</CardTitle>
				<CardDescription>Access your Aghara dashboard.</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					{...signInForm.enhance(async (form) => {
						try {
							const ok = await form.submit();
							if (!ok) {
								const issues = signInForm.fields.allIssues();
								if (issues?.[0]?.message) toast.error(issues[0].message);
								return;
							}
							if (form.result?.ok) {
								toast.success('Welcome back — taking you to your dashboard.');
								goto('/dashboard');
							} else if (form.result && !form.result.ok) {
								toast.error(form.result.message);
							}
						} catch (e) {
							toast.error(e instanceof Error ? e.message : 'Sign-in failed. Try again.');
						}
					})}
					class="space-y-4"
				>
					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							{...signInForm.fields.email.as('email')}
							id="email"
							placeholder="you@example.com"
							autocomplete="email"
							disabled={signInForm.pending > 0}
						/>
						{#each signInForm.fields.email.issues() ?? [] as issue (issue.message)}
							<p class="text-xs text-destructive" role="alert">{issue.message}</p>
						{/each}
					</div>
					<div class="space-y-2">
						<Label for="password">Password</Label>
						<PasswordInput
							field={signInForm.fields.password}
							id="password"
							placeholder="Your password"
							autocomplete="current-password"
							disabled={signInForm.pending > 0}
						/>
						{#each signInForm.fields.password.issues() ?? [] as issue (issue.message)}
							<p class="text-xs text-destructive" role="alert">{issue.message}</p>
						{/each}
					</div>
					{#if signInForm.result && !signInForm.result.ok}
						<p class="text-sm text-destructive" role="alert">{signInForm.result.message}</p>
					{/if}
					<Button type="submit" class="w-full gap-2" disabled={signInForm.pending > 0}>
						{#if signInForm.pending > 0}
							<LoaderCircle class="size-4 animate-spin" /> Signing in…
						{:else}
							Sign in <ArrowRight class="size-4" />
						{/if}
					</Button>
				</form>
				<p class="mt-4 text-center text-sm text-muted-foreground">
					New to Aghara?
					<a href="/register" class="font-medium text-primary hover:underline">Create an account</a>
				</p>
			</CardContent>
		</Card>
	</div>
</div>
