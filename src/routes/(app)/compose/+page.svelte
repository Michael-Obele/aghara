<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { createPostForm, listAccountsQuery } from '$lib/remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
		CardFooter
	} from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Send, Plus, Trash2, Link2, ArrowRight, Megaphone } from '@lucide/svelte/icons';

	const accounts = listAccountsQuery();

	// Smart defaults: pre-fill the first account and a sensible time — never start empty.
	let body = $state('');
	let mediaUrl = $state('');
	let mediaUrls = $state<string[]>([]);
	let targets = $state<{ channelAccountId: string; runAtLocal: string; runAtIso: string }[]>([]);

	function defaultRunAtLocal(): string {
		const d = new Date(Date.now() + 60 * 60 * 1000);
		d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	function initTargets() {
		const first = accounts.current?.[0]?.id ?? '';
		targets = [{ channelAccountId: first, runAtLocal: defaultRunAtLocal(), runAtIso: '' }];
	}
	// Populate once accounts arrive.
	$effect(() => {
		if (accounts.current && targets.length === 0) initTargets();
	});

	function addTarget() {
		targets = [...targets, { channelAccountId: '', runAtLocal: defaultRunAtLocal(), runAtIso: '' }];
	}

	function removeTarget(index: number) {
		targets = targets.filter((_, i) => i !== index);
	}

	function addMedia() {
		const url = mediaUrl.trim();
		if (!url) return;
		mediaUrls = [...mediaUrls, url];
		mediaUrl = '';
	}

	function removeMedia(index: number) {
		mediaUrls = mediaUrls.filter((_, i) => i !== index);
	}

	function toIso(local: string): string {
		if (!local) return '';
		return new Date(local).toISOString();
	}

	// Grapheme count (matches the server's Bluesky 300-char limit).
	const graphemes = $derived.by(() => {
		try {
			return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(body)].length;
		} catch {
			return [...body].length;
		}
	});

	const hasBlueskyTarget = $derived(
		targets.some(
			(t) => accounts.current?.find((a) => a.id === t.channelAccountId)?.channel === 'bluesky'
		)
	);
	const overLimit = $derived(hasBlueskyTarget && graphemes > 300);

	function onEnhance({ formData }: { formData: FormData }) {
		formData.set('body', body);
		targets.forEach((t, i) => {
			formData.set(`targets[${i}].channelAccountId`, t.channelAccountId);
			formData.set(`targets[${i}].runAt`, toIso(t.runAtLocal));
		});
		mediaUrls.forEach((u, i) => formData.set(`mediaUrls[${i}]`, u));
		return async ({ result }: { result: { type: string; message?: string } }) => {
			if (result.type === 'success') {
				toast.success('Scheduled — Aghara will announce on time.');
				goto('/schedule');
			} else {
				toast.error(result.message || 'Could not schedule the post.');
			}
		};
	}
</script>

<svelte:head><title>Compose — Aghara</title></svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Compose</h1>
		<p class="mt-1 text-muted-foreground">Write once. Choose where and when — Aghara announces.</p>
	</div>

	{#if !accounts.current}
		<div class="rounded-xl border border-dashed p-10 text-center">
			<Megaphone class="mx-auto size-8 text-muted-foreground" />
			<h3 class="mt-4 font-semibold">Connect a network first</h3>
			<p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
				You need at least one connected account before you can schedule.
			</p>
			<a href="/accounts" class="mt-6 inline-block">
				<Button class="gap-2"><Link2 class="size-4" /> Connect your first network</Button>
			</a>
		</div>
	{:else}
		<form {...createPostForm} use:enhance={onEnhance}>
			<div class="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Your message</CardTitle>
						<CardDescription>One post, sent everywhere you choose.</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<Label for="body">Post</Label>
							<Textarea
								id="body"
								bind:value={body}
								rows={6}
								placeholder="What do you want to announce?"
								class="resize-none"
							/>
							<p
								class="text-right text-xs"
								class:text-destructive={overLimit}
								class:text-muted-foreground={!overLimit}
							>
								{graphemes}{hasBlueskyTarget ? '/300' : ''} characters
							</p>
						</div>

						<div class="space-y-2">
							<Label for="media">Media URLs (optional)</Label>
							<div class="flex gap-2">
								<Input
									id="media"
									bind:value={mediaUrl}
									type="url"
									placeholder="https://…/image.jpg"
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											addMedia();
										}
									}}
								/>
								<Button type="button" variant="outline" onclick={addMedia}>Add</Button>
							</div>
							{#if mediaUrls.length > 0}
								<ul class="space-y-1">
									{#each mediaUrls as url, i (url)}
										<li
											class="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm"
										>
											<span class="truncate text-muted-foreground">{url}</span>
											<button
												type="button"
												class="text-muted-foreground transition hover:text-destructive"
												aria-label="Remove media"
												onclick={() => removeMedia(i)}
											>
												<Trash2 class="size-4" />
											</button>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Where &amp; when</CardTitle>
						<CardDescription>Each row announces to one connected account.</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						{#each targets as target, i (i)}
							<div class="rounded-lg border p-3">
								<div class="flex items-center justify-between">
									<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
										Target {i + 1}
									</p>
									{#if targets.length > 1}
										<button
											type="button"
											class="text-muted-foreground transition hover:text-destructive"
											aria-label="Remove target"
											onclick={() => removeTarget(i)}
										>
											<Trash2 class="size-4" />
										</button>
									{/if}
								</div>
								<div class="mt-3 grid gap-3 sm:grid-cols-2">
									<div class="space-y-1.5">
										<Label for={`target-${i}-account`}>Network</Label>
										<select
											id={`target-${i}-account`}
											bind:value={target.channelAccountId}
											class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
										>
											<option value="" disabled>Choose an account</option>
											{#each accounts.current ?? [] as account (account.id)}
												<option value={account.id}>{account.label}</option>
											{/each}
										</select>
									</div>
									<div class="space-y-1.5">
										<Label for={`target-${i}-time`}>Time</Label>
										<Input
											id={`target-${i}-time`}
											type="datetime-local"
											bind:value={target.runAtLocal}
										/>
									</div>
								</div>
							</div>
						{/each}

						<Button type="button" variant="outline" class="w-full gap-2" onclick={addTarget}>
							<Plus class="size-4" /> Add another target
						</Button>
					</CardContent>
					<CardFooter class="flex-col items-stretch gap-3">
						{#if overLimit}
							<p class="text-sm text-destructive">
								Bluesky allows 300 characters — trim your post before scheduling.
							</p>
						{/if}
						<Button type="submit" class="w-full gap-2" disabled={overLimit || !body.trim()}>
							<Send class="size-4" /> Schedule
							<ArrowRight class="size-4" />
						</Button>
					</CardFooter>
				</Card>
			</div>
		</form>
	{/if}
</div>
