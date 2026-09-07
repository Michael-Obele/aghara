<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Eye, EyeOff } from '@lucide/svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	type FieldLike = {
		as: (type: 'password' | 'text') => Record<string, unknown>;
	};

	let {
		id,
		name,
		placeholder,
		autocomplete,
		required = false,
		value = $bindable(''),
		field,
		class: className = '',
		disabled = false
	}: {
		id?: string;
		name?: string;
		placeholder?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		required?: boolean;
		value?: string;
		field?: FieldLike;
		class?: string;
		disabled?: boolean;
	} = $props();

	let show = $state(false);

	const inputType = $derived(show ? ('text' as const) : ('password' as const));
	const ariaLabel = $derived(show ? 'Hide password' : 'Show password');
</script>

<div class="relative">
	{#if field}
		<Input
			{...field.as(inputType)}
			{id}
			{name}
			{placeholder}
			{autocomplete}
			{required}
			{disabled}
			class="pr-10 {className}"
		/>
	{:else}
		<Input
			{id}
			{name}
			type={inputType}
			{placeholder}
			{autocomplete}
			{required}
			{disabled}
			bind:value
			class="pr-10 {className}"
		/>
	{/if}
	<Button
		type="button"
		variant="ghost"
		size="icon"
		class="absolute top-0 right-0 h-full w-10 rounded-l-none text-muted-foreground hover:bg-transparent hover:text-foreground"
		onclick={() => (show = !show)}
		aria-label={ariaLabel}
		aria-pressed={show}
		tabindex={-1}
	>
		{#if show}
			<EyeOff class="size-4" aria-hidden="true" />
		{:else}
			<Eye class="size-4" aria-hidden="true" />
		{/if}
	</Button>
</div>
