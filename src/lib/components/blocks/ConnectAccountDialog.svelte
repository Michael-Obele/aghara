<script lang="ts">
	import { enhance } from '$app/forms';
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
	import { Bird, Send, Hash, AtSign } from '@lucide/svelte/icons';
	import LinkedinIcon from '$lib/components/brand/LinkedinIcon.svelte';
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
			icon: Bird
		},
		telegram: {
			title: 'Connect Telegram',
			description: 'Create a bot with @BotFather, then paste its token and your chat ID.',
			icon: Send
		},
		discord: {
			title: 'Connect Discord',
			description: 'Paste a channel webhook URL from Server Settings → Integrations.',
			icon: Hash
		},
		mastodon: {
			title: 'Connect Mastodon',
			description: 'Your instance URL and an access token with write:statuses scope.',
			icon: AtSign
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

	function onEnhance({ formData }: { formData: FormData }) {
		formData.set('channel', channel);
		return async ({ result }: { result: { type: string; message?: string } }) => {
			if (result.type === 'success') {
				toast.success('Connected.');
				accounts.refresh();
				onClose();
			} else {
				toast.error(result.message || 'Could not connect that account.');
			}
		};
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

		<form {...connectAccountForm} use:enhance={onEnhance} class="space-y-4">
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
