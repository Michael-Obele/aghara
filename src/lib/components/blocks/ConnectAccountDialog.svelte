<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { connectAccountForm, listAccountsQuery } from '$lib/remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import BlueskyIcon from '$lib/components/brand/BlueskyIcon.svelte';
	import DiscordIcon from '$lib/components/brand/DiscordIcon.svelte';
	import LinkedinIcon from '$lib/components/brand/LinkedinIcon.svelte';
	import MastodonIcon from '$lib/components/brand/MastodonIcon.svelte';
	import TelegramIcon from '$lib/components/brand/TelegramIcon.svelte';
	import ThreadsIcon from '$lib/components/brand/ThreadsIcon.svelte';
	import type { Component } from 'svelte';

	let {
		open,
		channel,
		onClose
	}: {
		open: boolean;
		channel: string;
		onClose: () => void;
	} = $props();

	const accounts = listAccountsQuery();

	const channelMeta: Record<string, { title: string; description: string; icon: Component }> = {
		bluesky: {
			title: 'Connect Bluesky',
			description: 'Use your handle and an app password (Settings → App passwords).',
			icon: BlueskyIcon
		},
		telegram: {
			title: 'Connect Telegram',
			description: 'Create a bot with @BotFather, then paste its token and your chat ID.',
			icon: TelegramIcon
		},
		discord: {
			title: 'Connect Discord',
			description: 'Paste a channel webhook URL from Server Settings → Integrations.',
			icon: DiscordIcon
		},
		mastodon: {
			title: 'Connect Mastodon',
			description: 'Your instance URL and an access token with write:statuses scope.',
			icon: MastodonIcon
		},
		linkedin: {
			title: 'Connect LinkedIn',
			description: 'Paste an access token from your LinkedIn app (w_member_social scope).',
			icon: LinkedinIcon
		},
		threads: {
			title: 'Connect Threads',
			description: 'Your Threads user ID and a Meta access token.',
			icon: ThreadsIcon
		}
	};

	const meta = $derived(channelMeta[channel] ?? channelMeta.bluesky);

	// Remote-function form wiring: `connectAccountForm.enhance(...)` registers
	// this callback and returns the form instance to spread. Do NOT use
	// `use:enhance` from `$app/forms` — that posts to the page itself (405).
	async function onSubmit(form: { submit: () => Promise<boolean> }) {
		try {
			const valid = await form.submit();
			if (!valid) {
				toast.error('Please check the form — some fields are invalid.');
				return;
			}
			if (connectAccountForm.result?.ok === false) {
				toast.error(connectAccountForm.result.message || 'Could not connect that account.');
				return;
			}
			toast.success('Connected.');
			accounts.refresh();
			onClose();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Could not connect that account.');
		}
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<meta.icon class="size-5" />
				{meta.title}
			</DialogTitle>
			<DialogDescription>{meta.description}</DialogDescription>
		</DialogHeader>

		<form {...connectAccountForm.enhance(onSubmit)} class="space-y-4">
			<input type="hidden" name="channel" value={channel} />
			{#if channel === 'bluesky'}
				<div class="space-y-2">
					<Label for="handle">Handle</Label>
					<Input
						id="handle"
						name="handle"
						type="text"
						placeholder="you.bsky.social"
						autocomplete="off"
						required
					/>
				</div>
				<div class="space-y-2">
					<Label for="appPassword">App password</Label>
					<Input
						id="appPassword"
						name="appPassword"
						type="password"
						placeholder="xxxx-xxxx-xxxx-xxxx"
						autocomplete="off"
						required
					/>
				</div>
			{:else if channel === 'telegram'}
				<div class="space-y-2">
					<Label for="botToken">Bot token</Label>
					<Input
						id="botToken"
						name="botToken"
						type="password"
						placeholder="123456:ABC-DEF…"
						autocomplete="off"
						required
					/>
				</div>
				<div class="space-y-2">
					<Label for="chatId">Chat ID</Label>
					<Input
						id="chatId"
						name="chatId"
						type="text"
						placeholder="-1001234567890"
						autocomplete="off"
						required
					/>
				</div>
			{:else if channel === 'discord'}
				<div class="space-y-2">
					<Label for="webhookUrl">Webhook URL</Label>
					<Input
						id="webhookUrl"
						name="webhookUrl"
						type="url"
						placeholder="https://discord.com/api/webhooks/…"
						autocomplete="off"
						required
					/>
				</div>
			{:else if channel === 'mastodon'}
				<div class="space-y-2">
					<Label for="instanceUrl">Instance URL</Label>
					<Input
						id="instanceUrl"
						name="instanceUrl"
						type="url"
						placeholder="https://mastodon.social"
						autocomplete="off"
						required
					/>
				</div>
				<div class="space-y-2">
					<Label for="accessToken">Access token</Label>
					<Input
						id="accessToken"
						name="accessToken"
						type="password"
						placeholder="Your token"
						autocomplete="off"
						required
					/>
				</div>
			{:else if channel === 'linkedin'}
				<div class="space-y-2">
					<Label for="accessToken">Access token</Label>
					<Input
						id="accessToken"
						name="accessToken"
						type="password"
						placeholder="Your token"
						autocomplete="off"
						required
					/>
				</div>
			{:else if channel === 'threads'}
				<div class="space-y-2">
					<Label for="userId">User ID</Label>
					<Input
						id="userId"
						name="userId"
						type="text"
						placeholder="Your Threads user ID"
						autocomplete="off"
						required
					/>
				</div>
				<div class="space-y-2">
					<Label for="accessToken">Access token</Label>
					<Input
						id="accessToken"
						name="accessToken"
						type="password"
						placeholder="Your token"
						autocomplete="off"
						required
					/>
				</div>
			{/if}

			<DialogFooter>
				<Button type="button" variant="outline" onclick={onClose}>Cancel</Button>
				<Button type="submit">Connect</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>
