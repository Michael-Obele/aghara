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

<div class="flex min-h-0 flex-1">
	<!-- Desktop sidebar — app nav only (global Navbar/Footer live in +layout.svelte) -->
	<aside class="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
		<div
			class="flex h-12 items-center gap-2 border-b px-5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
		>
			App
		</div>
		<nav class="flex-1 space-y-1 p-3" aria-label="App navigation">
			{#each nav as item}
				<a
					href={item.href}
					aria-current={isActive(item.href) ? 'page' : undefined}
					class={isActive(item.href)
						? 'flex items-center gap-3 rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground'
						: 'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'}
				>
					<item.icon class="size-4 shrink-0" aria-hidden="true" />
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="border-t p-4">
			<div class="flex items-center justify-between gap-2">
				<span class="truncate text-sm font-medium">{data.user.name}</span>
				{#if planLabel}
					<Badge variant="secondary" class="shrink-0 gap-1">
						{#if plan.current?.plan === 'self-host'}<Infinity
								class="size-3"
								aria-hidden="true"
							/>{/if}
						{planLabel}
					</Badge>
				{/if}
			</div>
			<Button
				variant="ghost"
				class="mt-3 w-full justify-start gap-2 text-muted-foreground"
				onclick={signOut}
			>
				<LogOut class="size-4" aria-hidden="true" /> Sign out
			</Button>
		</div>
	</aside>

	<!-- Mobile app nav + content -->
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="flex h-12 items-center justify-between border-b px-4 md:hidden">
			<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">App</span>
			<Sheet>
				<SheetTrigger>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="icon" aria-label="Open app menu">
							<Menu class="size-4" />
						</Button>
					{/snippet}
				</SheetTrigger>
				<SheetContent side="left">
					<SheetHeader>
						<SheetTitle class="flex items-center gap-2">
							<span
								class="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
							>
								<Megaphone class="size-4" aria-hidden="true" />
							</span>
							Aghara
						</SheetTitle>
					</SheetHeader>
					<nav class="mt-4 space-y-1" aria-label="App navigation">
						{#each nav as item}
							<a
								href={item.href}
								aria-current={isActive(item.href) ? 'page' : undefined}
								class={isActive(item.href)
									? 'flex items-center gap-3 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground'
									: 'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent/60 hover:text-accent-foreground'}
							>
								<item.icon class="size-4 shrink-0" aria-hidden="true" />
								{item.label}
							</a>
						{/each}
						<button
							type="button"
							class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent/60 hover:text-accent-foreground"
							onclick={signOut}
						>
							<LogOut class="size-4 shrink-0" aria-hidden="true" /> Sign out
						</button>
					</nav>
				</SheetContent>
			</Sheet>
		</div>

		<main class="flex-1 px-4 py-8 md:px-8">
			<div class="mx-auto max-w-5xl">{@render children()}</div>
		</main>
	</div>
</div>
