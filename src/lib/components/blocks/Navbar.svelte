<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { currentUserQuery, signOutCommand, myPlanQuery } from '$lib/remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ThemeToggle from '$lib/components/blocks/ThemeToggle.svelte';
	import {
		Megaphone,
		Menu,
		LogOut,
		LayoutDashboard,
		CreditCard,
		KeyRound,
		User,
		Infinity
	} from '@lucide/svelte/icons';

	const userQuery = currentUserQuery();
	const planQuery = myPlanQuery();

	let mobileOpen = $state(false);

	const user = $derived(userQuery.current);
	const plan = $derived(planQuery.current);

	const initials = $derived.by(() => {
		if (!user?.name) return '?';
		return user.name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	});

	const planLabel = $derived.by(() => {
		if (!plan?.plan) return '';
		if (plan.plan === 'self-host') return 'Self-host';
		return plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1);
	});

	async function handleSignOut() {
		await signOutCommand();
		mobileOpen = false;
		goto('/');
		// refresh queries so navbar updates immediately
		userQuery.refresh();
		planQuery.refresh();
	}

	function closeMobile() {
		mobileOpen = false;
	}

	const marketingNav = [
		{ href: '/#how', label: 'How it works' },
		{ href: '/#features', label: 'Why Aghara' },
		{ href: '/#compare', label: 'Compare' },
		{ href: '/#pricing', label: 'Pricing' },
		{ href: '/#faq', label: 'FAQ' },
		{ href: '/docs/mcp', label: 'MCP' }
	];

	const appNav = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/billing', label: 'Billing', icon: CreditCard },
		{ href: '/tokens', label: 'API tokens', icon: KeyRound }
	];

	function isActive(href: string) {
		return page.url.pathname === href;
	}
</script>

<header
	class="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60"
>
	<div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
		<!-- Left: brand -->
		<a
			href="/"
			class="flex items-center gap-2 font-semibold tracking-tight"
			aria-label="Aghara home"
		>
			<span
				class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
			>
				<Megaphone class="size-4" aria-hidden="true" />
			</span>
			<span class="hidden sm:inline">Aghara</span>
		</a>

		<!-- Center: desktop nav -->
		<nav class="hidden items-center gap-6 text-sm md:flex" aria-label="Primary">
			{#if user}
				<!-- Authenticated: quick app links (sidebar has full nav, navbar keeps it light) -->
				<a
					href="/dashboard"
					class={isActive('/dashboard')
						? 'font-medium text-foreground'
						: 'text-muted-foreground transition hover:text-foreground'}
				>
					Dashboard
				</a>
				<a
					href="/compose"
					class={isActive('/compose')
						? 'font-medium text-foreground'
						: 'text-muted-foreground transition hover:text-foreground'}
				>
					Compose
				</a>
				<a
					href="/schedule"
					class={isActive('/schedule')
						? 'font-medium text-foreground'
						: 'text-muted-foreground transition hover:text-foreground'}
				>
					Schedule
				</a>
				<a
					href="/accounts"
					class={isActive('/accounts')
						? 'font-medium text-foreground'
						: 'text-muted-foreground transition hover:text-foreground'}
				>
					Accounts
				</a>
			{:else}
				{#each marketingNav as item (item.href)}
					<a href={item.href} class="text-muted-foreground transition hover:text-foreground">
						{item.label}
					</a>
				{/each}
			{/if}
		</nav>

		<!-- Right: actions -->
		<div class="flex items-center gap-2">
			<ThemeToggle />

			{#if userQuery.loading}
				<div class="hidden h-9 w-24 animate-pulse rounded-md bg-muted md:block"></div>
			{:else if user}
				<!-- Desktop: avatar dropdown -->
				<div class="hidden md:block">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									class="flex items-center gap-2 rounded-full border bg-card px-1.5 py-1 pr-3 text-sm font-medium transition hover:bg-accent"
									aria-label="User menu"
								>
									<Avatar.Root size="sm" class="size-7">
										<Avatar.Fallback class="text-xs">{initials}</Avatar.Fallback>
									</Avatar.Root>
									<span class="max-w-24 truncate">{user.name}</span>
									{#if planLabel}
										<Badge variant="secondary" class="hidden gap-1 lg:inline-flex">
											{#if plan?.plan === 'self-host'}<Infinity class="size-3" />{/if}
											{planLabel}
										</Badge>
									{/if}
								</button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-56">
							<DropdownMenu.Label class="flex flex-col gap-1">
								<span class="font-medium">{user.name}</span>
								<span class="text-xs font-normal text-muted-foreground">{user.email}</span>
								{#if planLabel}
									<Badge variant="secondary" class="mt-1 w-fit gap-1">
										{#if plan?.plan === 'self-host'}<Infinity class="size-3" />{/if}
										{planLabel}
									</Badge>
								{/if}
							</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Group>
								<DropdownMenu.Item onclick={() => goto('/dashboard')}>
									<LayoutDashboard class="size-4" />
									Dashboard
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => goto('/billing')}>
									<CreditCard class="size-4" />
									Billing
								</DropdownMenu.Item>
								<DropdownMenu.Item onclick={() => goto('/tokens')}>
									<KeyRound class="size-4" />
									API tokens
								</DropdownMenu.Item>
							</DropdownMenu.Group>
							<DropdownMenu.Separator />
							<DropdownMenu.Item variant="destructive" onclick={handleSignOut}>
								<LogOut class="size-4" />
								Sign out
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{:else}
				<div class="hidden items-center gap-2 md:flex">
					<a href="/login">
						<Button variant="ghost">Sign in</Button>
					</a>
					<a href="/register">
						<Button>Post once, show up everywhere</Button>
					</a>
				</div>
			{/if}

			<!-- Mobile: sheet -->
			<Sheet.Root bind:open={mobileOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="outline"
							size="icon"
							class="md:hidden"
							aria-label="Open menu"
						>
							<Menu class="size-4" />
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content side="right" class="w-80">
					<Sheet.Header>
						<Sheet.Title class="flex items-center gap-2 text-left">
							<span
								class="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
							>
								<Megaphone class="size-4" />
							</span>
							Aghara
							<span class="text-xs font-normal text-muted-foreground"
								>town crier for the internet</span
							>
						</Sheet.Title>
					</Sheet.Header>

					<div class="flex flex-1 flex-col gap-6 px-4 py-4">
						{#if user}
							<div class="flex items-center gap-3 rounded-lg border bg-card p-3">
								<Avatar.Root>
									<Avatar.Fallback>{initials}</Avatar.Fallback>
								</Avatar.Root>
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">{user.name}</p>
									<p class="truncate text-xs text-muted-foreground">{user.email}</p>
								</div>
								{#if planLabel}
									<Badge variant="secondary" class="gap-1">
										{#if plan?.plan === 'self-host'}<Infinity class="size-3" />{/if}
										{planLabel}
									</Badge>
								{/if}
							</div>

							<nav class="space-y-1" aria-label="App">
								{#each appNav as item (item.href)}
									<a
										href={item.href}
										onclick={closeMobile}
										class={isActive(item.href)
											? 'flex items-center gap-3 rounded-md bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground'
											: 'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-accent/60 hover:text-accent-foreground'}
									>
										<item.icon class="size-4 shrink-0" />
										{item.label}
									</a>
								{/each}
								<a
									href="/dashboard"
									onclick={closeMobile}
									class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-accent/60 hover:text-accent-foreground"
								>
									<User class="size-4 shrink-0" /> Dashboard
								</a>
							</nav>

							<Separator />

							<Button variant="ghost" class="justify-start gap-2" onclick={handleSignOut}>
								<LogOut class="size-4" /> Sign out
							</Button>
						{:else}
							<nav class="space-y-1" aria-label="Marketing">
								{#each marketingNav as item (item.href)}
									<a
										href={item.href}
										onclick={closeMobile}
										class="flex items-center rounded-md px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
									>
										{item.label}
									</a>
								{/each}
							</nav>

							<Separator />

							<div class="grid gap-2">
								<a href="/login" onclick={closeMobile}>
									<Button variant="outline" class="w-full">Sign in</Button>
								</a>
								<a href="/register" onclick={closeMobile}>
									<Button class="w-full">Post once, show up everywhere</Button>
								</a>
							</div>
							<p class="text-center text-xs text-muted-foreground">
								Demo needs no account · Paid plan from $5/mo to post
							</p>
						{/if}
					</div>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</div>
</header>
