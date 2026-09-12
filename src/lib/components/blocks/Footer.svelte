<script lang="ts">
	import { Megaphone } from '@lucide/svelte/icons';

	const year = new Date().getFullYear();
</script>

<footer class="border-t bg-card/30">
	<div class="mx-auto max-w-6xl px-4 py-10 md:px-6">
		<div class="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
			<!-- Brand -->
			<div class="space-y-3">
				<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
					<span
						class="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
					>
						<Megaphone class="size-3.5" aria-hidden="true" />
					</span>
					Aghara
				</a>
				<p class="max-w-sm text-sm text-muted-foreground">
					The town crier for the internet — write once, Aghara announces on schedule. Bluesky-first,
					six networks, posted on time.
				</p>
				<p class="text-xs text-muted-foreground">
					© {year} Aghara · Checks your queue every minute
				</p>
			</div>

			<!-- Links -->
			<div class="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
				<div class="space-y-3">
					<p class="font-medium">Product</p>
					<ul class="space-y-2 text-muted-foreground">
						<li><a href="/#how" class="transition hover:text-foreground">How it works</a></li>
						<li><a href="/#features" class="transition hover:text-foreground">Why Aghara</a></li>
						<li><a href="/#pricing" class="transition hover:text-foreground">Pricing</a></li>
						<li><a href="/#faq" class="transition hover:text-foreground">FAQ</a></li>
					</ul>
				</div>
				<div class="space-y-3">
					<p class="font-medium">Account</p>
					<ul class="space-y-2 text-muted-foreground">
						<li><a href="/login" class="transition hover:text-foreground">Sign in</a></li>
						<li><a href="/register" class="transition hover:text-foreground">Create account</a></li>
						<li><a href="/dashboard" class="transition hover:text-foreground">Dashboard</a></li>
						<li><a href="/billing" class="transition hover:text-foreground">Billing</a></li>
					</ul>
				</div>
				<div class="space-y-3">
					<p class="font-medium">Developers</p>
					<ul class="space-y-2 text-muted-foreground">
						<li><a href="/docs/mcp" class="transition hover:text-foreground">MCP server</a></li>
						<li><a href="/tokens" class="transition hover:text-foreground">API tokens</a></li>
						<li>
							<a href="/api/v1/health" class="transition hover:text-foreground">API health</a>
						</li>
						<li>
							<a
								href="https://github.com/Michael-Obele/aghara"
								target="_blank"
								rel="noreferrer"
								class="transition hover:text-foreground">GitHub</a
							>
						</li>
					</ul>
				</div>
			</div>
		</div>

		<div
			class="mt-8 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
		>
			<p>
				Self-host with <code class="rounded bg-muted px-1 py-0.5">SELF_HOST=true</code> — same app, your
				server.
			</p>
			<p>Built with SvelteKit 5 · Tailwind v4 · Better Auth</p>
		</div>
	</div>
</footer>
