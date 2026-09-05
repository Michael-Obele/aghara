<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { signOutCommand, myPlanQuery } from '$lib/remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		Sheet,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetTrigger
	} from '$lib/components/ui/sheet/index.js';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import ThemeToggle from '$lib/components/blocks/ThemeToggle.svelte';
	import {
		Megaphone,
		LayoutDashboard,
		Send,
		CalendarClock,
		Link2,
		CreditCard,
		KeyRound,
		LogOut,
		Menu,
		Infinity
	} from '@lucide/svelte/icons';

	let { children, data }: { children: import('svelte').Snippet; data: { user: { name: string } } } =
		$props();

	const nav = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/compose', label: 'Compose', icon: Send },
		{ href: '/schedule', label: 'Schedule', icon: CalendarClock },
		{ href: '/accounts', label: 'Accounts', icon: Link2 },
		{ href: '/billing', label: 'Billing', icon: CreditCard },
		{ href: '/tokens', label: 'API tokens', icon: KeyRound }
	];

	const plan = myPlanQuery();

	async function signOut() {
		await signOutCommand();
		goto('/');
	}

	function isActive(href: string) {
		return page.url.pathname === href;
	}

	const planLabel = $derived.by(() => {
		const p = plan.current;
		if (!p || !p.plan) return '';
		return p.plan === 'self-host' ? 'Self-host' : p.plan.charAt(0).toUpperCase() + p.plan.slice(1);
	});
</script>

<Toaster />

<div class="flex min-h-svh">
	<!-- Desktop sidebar -->
	<aside class="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
		<div class="flex h-16 items-center gap-2 border-b px-5">
			<span
				class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
			>
				<Megaphone class="size-4" />
			</span>
			<span class="font-semibold tracking-tight">Aghara</span>
		</div>
		<nav class="flex-1 space-y-1 p-3">
			{#each nav as item}
				<a
					href={item.href}
					class={isActive(item.href)
						? 'flex items-center gap-3 rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground'
						: 'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'}
				>
					<item.icon class="size-4 shrink-0" />
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="border-t p-4">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium">{data.user.name}</span>
				{#if planLabel}
					<Badge variant="secondary" class="gap-1">
						{#if plan.current?.plan === 'self-host'}<Infinity class="size-3" />{/if}
						{planLabel}
					</Badge>
				{/if}
			</div>
			<Button
				variant="ghost"
				class="mt-3 w-full justify-start gap-2 text-muted-foreground"
				onclick={signOut}
			>
				<LogOut class="size-4" /> Sign out
			</Button>
			<div class="mt-2 flex justify-end">
				<ThemeToggle />
			</div>
		</div>
	</aside>

	<!-- Mobile top bar -->
	<div class="flex min-w-0 flex-1 flex-col">
		<header class="flex h-16 items-center justify-between border-b px-4 md:hidden">
			<div class="flex items-center gap-2 font-semibold tracking-tight">
				<span
					class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
				>
					<Megaphone class="size-4" />
				</span>
				Aghara
			</div>
			<div class="flex items-center gap-2">
				<ThemeToggle variant="outline" />
				<Sheet>
					<SheetTrigger>
						<Button variant="outline" size="icon" aria-label="Open menu">
							<Menu class="size-4" />
						</Button>
					</SheetTrigger>
					<SheetContent side="left">
						<SheetHeader>
							<SheetTitle class="flex items-center gap-2">
								<span
									class="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
								>
									<Megaphone class="size-4" />
								</span>
								Aghara
							</SheetTitle>
						</SheetHeader>
						<nav class="mt-4 space-y-1">
							{#each nav as item}
								<a
									href={item.href}
									class={isActive(item.href)
										? 'flex items-center gap-3 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground'
										: 'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent/60 hover:text-accent-foreground'}
								>
									<item.icon class="size-4 shrink-0" />
									{item.label}
								</a>
							{/each}
							<button
								type="button"
								class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent/60 hover:text-accent-foreground"
								onclick={signOut}
							>
								<LogOut class="size-4 shrink-0" /> Sign out
							</button>
						</nav>
					</SheetContent>
				</Sheet>
			</div>
		</header>

		<main class="flex-1 px-4 py-8 md:px-8">
			<div class="mx-auto max-w-5xl">{@render children()}</div>
		</main>
	</div>
</div>
