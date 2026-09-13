<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { listPlatformsQuery, updateScheduledCommand } from '$lib/remote';
	import type { ScheduledPostRow } from '$lib/remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { cn } from '$lib/utils';
	import {
		getBrowserTimeZone,
		instantToLocalInput,
		isLocalTimePast,
		localToInstant
	} from '$lib/time';
	import { Info, LoaderCircle, Pencil, Plus, Save, Trash2 } from '@lucide/svelte/icons';

	let {
		post,
		siblingLabels = [],
		onclose,
		onsaved
	}: {
		post: ScheduledPostRow;
		siblingLabels?: string[];
		onclose: () => void;
		onsaved: () => void;
	} = $props();

	const platforms = listPlatformsQuery();
	// Edits happen in the viewer's current timezone; conversions are DST-safe via Temporal.
	const zone = getBrowserTimeZone();

	function graphemeCount(text: string): number {
		try {
			return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length;
		} catch {
			return [...text].length;
		}
	}

	// Seeded from the row once — the dialog is mounted per edit, so capturing the
	// prop at init is intentional (not a live binding). `state_referenced_locally`
	// is expected here and suppressed explicitly.
	// svelte-ignore state_referenced_locally
	let body = $state(post.body);
	// svelte-ignore state_referenced_locally
	let segments = $state<string[]>(post.segments.length > 0 ? [...post.segments] : []);
	// svelte-ignore state_referenced_locally
	let runAtLocal = $state(instantToLocalInput(new Date(post.runAt).toISOString(), zone));
	let saving = $state(false);
	let open = $state(true);

	// svelte-ignore state_referenced_locally
	const originalRunAt = instantToLocalInput(new Date(post.runAt).toISOString(), zone);
	const isThread = $derived(segments.length > 0);
	const platform = $derived(platforms.current?.find((p) => p.channel === post.channel));
	const canSplit = $derived(
		Boolean(platform && (platform.features.threads || platform.features.sequentialSplit))
	);
	const count = $derived(graphemeCount(isThread ? segments.join('\n\n') : body));
	const overLimit = $derived(Boolean(platform && !canSplit && count > platform.maxLength));
	const empty = $derived(isThread ? segments.every((s) => !s.trim()) : !body.trim());
	const overParts = $derived(
		!platform
			? []
			: segments
					.map((s, i) => (graphemeCount(s) > platform.maxLength ? i : -1))
					.filter((i) => i >= 0)
	);
	const runAtChanged = $derived(runAtLocal !== originalRunAt);
	const runAtPast = $derived(runAtChanged && isLocalTimePast(runAtLocal, zone));
	const canSave = $derived(!saving && !empty && !overLimit && !runAtPast);

	async function save() {
		if (!canSave) return;
		saving = true;
		const toastId = toast.loading('Saving…');
		try {
			const parts = isThread ? segments.map((s) => s.trim()).filter(Boolean) : [];
			const payload: { scheduledId: string; body: string; segments: string[]; runAt?: string } = {
				scheduledId: post.scheduledId,
				body: isThread ? parts.join('\n\n') : body.trim(),
				segments: parts
			};
			if (post.status === 'queued' && runAtChanged) {
				payload.runAt = localToInstant(runAtLocal, zone);
			}
			await updateScheduledCommand(payload);
			toast.success(
				siblingLabels.length > 0 ? 'Updated — applies to every queued copy.' : 'Updated.',
				{ id: toastId }
			);
			onsaved();
			open = false;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Could not save the changes.', {
				id: toastId
			});
		} finally {
			saving = false;
		}
	}
</script>

<Dialog
	bind:open
	onOpenChangeComplete={(o) => {
		if (!o) onclose();
	}}
>
	<DialogContent class="sm:max-w-lg">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<Pencil class="size-5" /> Edit post
			</DialogTitle>
			<DialogDescription>
				{platform?.name ?? post.channel} · {post.label}
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			{#if siblingLabels.length > 0}
				<div
					class="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground"
				>
					<Info class="mt-0.5 size-4 shrink-0" />
					<p>
						This post is also queued for {siblingLabels.join(' · ')}. Saving updates the content for
						every copy that hasn't gone out yet.
					</p>
				</div>
			{/if}

			{#if isThread}
				<div class="space-y-3">
					{#each segments as seg, i (i)}
						<div class="space-y-1.5">
							<div class="flex items-center justify-between">
								<Label for={`edit-part-${i}`}>Part {i + 1}</Label>
								{#if segments.length > 1}
									<button
										type="button"
										class="text-muted-foreground transition hover:text-destructive"
										aria-label={`Remove part ${i + 1}`}
										onclick={() => (segments = segments.filter((_, j) => j !== i))}
									>
										<Trash2 class="size-3.5" />
									</button>
								{/if}
							</div>
							<Textarea
								id={`edit-part-${i}`}
								bind:value={segments[i]}
								rows={3}
								placeholder={`Part ${i + 1}${platform ? ` — up to ${platform.maxLength} chars` : ''}`}
								class="resize-none"
								aria-invalid={platform && graphemeCount(seg) > platform.maxLength
									? true
									: undefined}
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
					{#if overParts.length > 0}
						<p class="text-xs text-muted-foreground">
							{overParts.length === 1 ? 'One part is' : `${overParts.length} parts are`} over the
							{platform?.maxLength}-char limit — Aghara will auto-split it on publish.
						</p>
					{/if}
				</div>
			{:else}
				<div class="space-y-1.5">
					<Label for="edit-body">Post</Label>
					<Textarea
						id="edit-body"
						bind:value={body}
						rows={6}
						placeholder="What do you want to announce?"
						class="resize-none"
					/>
				</div>
			{/if}

			<div class="space-y-1">
				<p
					class={cn('text-right text-xs', overLimit ? 'text-destructive' : 'text-muted-foreground')}
				>
					{count}{platform ? `/${platform.maxLength}` : ''} characters
				</p>
				{#if overLimit}
					<p class="text-right text-xs text-destructive">
						{platform?.name} allows {platform?.maxLength} characters and can't split — trim the post or
						use fewer parts.
					</p>
				{/if}
			</div>

			{#if post.status === 'queued'}
				<div class="space-y-1.5">
					<Label for="edit-run-at">Send at</Label>
					<Input id="edit-run-at" type="datetime-local" bind:value={runAtLocal} />
					{#if runAtPast}
						<p class="text-xs text-destructive">Pick a time in the future.</p>
					{:else}
						<p class="text-xs text-muted-foreground">
							Your local time. Leave it as-is to keep the current schedule.
						</p>
					{/if}
				</div>
			{:else}
				<p class="text-xs text-muted-foreground">
					This post has failed and won't send on its own — save your edits, then use Retry to pick a
					new time.
				</p>
			{/if}
		</div>

		<DialogFooter>
			<Button type="button" variant="outline" disabled={saving} onclick={() => (open = false)}>
				Cancel
			</Button>
			<Button type="button" class="gap-1.5" disabled={!canSave} onclick={save}>
				{#if saving}
					<LoaderCircle class="size-3.5 animate-spin" /> Saving…
				{:else}
					<Save class="size-3.5" /> Save changes
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
