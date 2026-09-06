<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';
	import { createPostForm, listAccountsQuery, listPlatformsQuery } from '$lib/remote';
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
	import {
		Send,
		Plus,
		Trash2,
		Link2,
		ArrowRight,
		Megaphone,
		FileText,
		ListTree
	} from '@lucide/svelte/icons';

	const accounts = listAccountsQuery();
	const platforms = listPlatformsQuery();

	// Smart defaults: pre-fill the first account and a sensible time — never start empty.
	let body = $state('');
	let isThread = $state(false);
	let segments = $state(['']);
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

	// Grapheme count (matches the server-side per-platform limits).
	function graphemeCount(text: string): number {
		try {
			return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length;
		} catch {
			return [...text].length;
		}
	}

	const composedText = $derived(isThread ? segments.join('\n\n') : body);
	const graphemes = $derived(graphemeCount(composedText));
	const submittedSegments = $derived(segments.map((s) => s.trim()).filter(Boolean));

	// Active platform = the first target with an account chosen (drives limits/hints).
	const activeTarget = $derived(targets.find((t) => t.channelAccountId));
	const activeChannel = $derived(
		accounts.current?.find((a) => a.id === activeTarget?.channelAccountId)?.channel
	);
	const activePlatform = $derived(platforms.current?.find((p) => p.channel === activeChannel));

	const canSplit = $derived(
		Boolean(
			activePlatform && (activePlatform.features.threads || activePlatform.features.sequentialSplit)
		)
	);
	const overLimit = $derived(
		Boolean(activePlatform && !canSplit && graphemes > activePlatform.maxLength)
	);
	const willSplit = $derived(
		Boolean(activePlatform && canSplit && graphemes > activePlatform.maxLength)
	);

	// Remote-function form wiring: `createPostForm.enhance(...)` registers this
	// callback and returns the form instance to spread. Do NOT use `use:enhance`
	// from `$app/forms` — that posts to the page itself (405). Body, targets and
	// media are carried by hidden inputs inside the form (bound to state below).
	async function onSubmit(form: { submit: () => Promise<boolean> }) {
		try {
			const valid = await form.submit();
			if (!valid) {
				toast.error('Please check the form — some fields are invalid.');
				return;
			}
			if (createPostForm.result?.ok === false) {
				toast.error(createPostForm.result.message || 'Could not schedule the post.');
				return;
			}
			toast.success('Scheduled — Aghara will announce on time.');
			goto('/schedule');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Could not schedule the post.');
		}
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
		<form {...createPostForm.enhance(onSubmit)}>
			<input
				type="hidden"
				name="body"
				value={isThread ? submittedSegments.join('\n\n') || body : body}
			/>
			{#if isThread}
				{#each submittedSegments as seg, i (i)}
					<input type="hidden" name={`segments[${i}]`} value={seg} />
				{/each}
			{/if}
			{#each targets as target, i (i)}
				<input
					type="hidden"
					name={`targets[${i}].channelAccountId`}
					value={target.channelAccountId}
				/>
				<input type="hidden" name={`targets[${i}].runAt`} value={toIso(target.runAtLocal)} />
			{/each}
			{#each mediaUrls as url, i (url)}
				<input type="hidden" name={`mediaUrls[${i}]`} value={url} />
			{/each}
			<div class="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Your message</CardTitle>
						<CardDescription>One post, sent everywhere you choose.</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-2">
							<div class="flex items-center justify-between gap-3">
								<Label for="body">Post</Label>
								<div class="flex overflow-hidden rounded-md border">
									<button
										type="button"
										class={cn(
											'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition',
											!isThread ? 'bg-secondary text-foreground' : 'text-muted-foreground'
										)}
										onclick={() => (isThread = false)}
									>
										<FileText class="size-3.5" /> Single
									</button>
									<button
										type="button"
										class={cn(
											'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition',
											isThread ? 'bg-secondary text-foreground' : 'text-muted-foreground'
										)}
										onclick={() => (isThread = true)}
									>
										<ListTree class="size-3.5" /> Thread
									</button>
								</div>
							</div>

							{#if !isThread}
								<Textarea
									id="body"
									bind:value={body}
									rows={6}
									placeholder="What do you want to announce?"
									class="resize-none"
								/>
							{:else}
								{#each segments as seg, i (i)}
									<div class="space-y-1.5">
										<div class="flex items-center justify-between">
											<span class="text-xs font-medium text-muted-foreground">Part {i + 1}</span>
											{#if segments.length > 1}
												<button
													type="button"
													class="text-muted-foreground transition hover:text-destructive"
													aria-label="Remove part"
													onclick={() => (segments = segments.filter((_, j) => j !== i))}
												>
													<Trash2 class="size-3.5" />
												</button>
											{/if}
										</div>
										<Textarea
											bind:value={segments[i]}
											rows={4}
											placeholder={`Part ${i + 1} — up to ${activePlatform?.maxLength ?? ''} chars`}
											class="resize-none"
										/>
									</div>
								{/each}
								<Button
									type="button"
									variant="outline"
									class="w-full gap-2"
									onclick={() => (segments = [...segments, ''])}
								>
									<Plus class="size-4" /> Add part
								</Button>
							{/if}

							<div class="space-y-1">
								<p
									class="text-right text-xs"
									class:text-destructive={overLimit}
									class:text-muted-foreground={!overLimit}
								>
									{graphemes}{activePlatform ? `/${activePlatform.maxLength}` : ''} characters
								</p>
								{#if willSplit}
									<p class="text-right text-xs text-muted-foreground">
										Over the {activePlatform?.maxLength}-char limit — Aghara will auto-split into a
										{activePlatform?.features.threads ? 'thread' : 'series of messages'} on
										{activePlatform?.name}.
									</p>
								{/if}
							</div>
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
								{activePlatform?.name} allows {activePlatform?.maxLength} characters and can't split —
								trim your post or use a thread-capable network.
							</p>
						{/if}
						<Button
							type="submit"
							class="w-full gap-2"
							disabled={overLimit || (isThread ? submittedSegments.length === 0 : !body.trim())}
						>
							<Send class="size-4" /> Schedule
							<ArrowRight class="size-4" />
						</Button>
					</CardFooter>
				</Card>
			</div>
		</form>
	{/if}
</div>
