<script lang="ts">
	import { themeStore, type Theme } from '$lib/stores/theme.svelte';

	let { placement = 'top' }: { placement?: 'top' | 'bottom' } = $props();

	let isOpen = $state(false);
	let containerNode: HTMLElement;

	function apply(theme: Theme) {
		themeStore.set(theme);
		isOpen = false;
	}

	$effect(() => {
		themeStore.init();
	});

	$effect(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.classList.toggle('dark', themeStore.isDark);
		}
	});

	function handleWindowClick(e: MouseEvent) {
		if (isOpen && containerNode && !containerNode.contains(e.target as Node)) {
			isOpen = false;
		}
	}

	const options: { value: Theme; icon: string; label: string }[] = [
		{ value: 'light', icon: '☀️', label: 'Light' },
		{ value: 'dark',  icon: '🌙', label: 'Dark'  },
		{ value: 'system',icon: '💻', label: 'System'}
	];

	let currentOption = $derived(options.find(o => o.value === themeStore.preference) || options[2]);
</script>

<svelte:window onclick={handleWindowClick} />

<div bind:this={containerNode} class="relative w-full" role="presentation">
	<button
		onclick={() => isOpen = !isOpen}
		class="flex w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200/60 bg-slate-100/50 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition-all hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
		aria-label="Select theme"
		aria-expanded={isOpen}
	>
		<div class="flex items-center gap-2.5">
			<span class="text-base">{currentOption.icon}</span>
			<span class="hidden xl:inline-block">{currentOption.label} Theme</span>
		</div>
		<span 
			class="text-[10px] text-slate-400 transition-transform duration-300 dark:text-slate-500" 
			style="transform: rotate({isOpen ? (placement === 'top' ? '180deg' : '-180deg') : '0deg'})"
		>▼</span>
	</button>

	{#if isOpen}
		<div
			class="absolute {placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 z-50 w-full animate-fade-up overflow-hidden rounded-xl border border-slate-200/60 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95"
		>
			{#each options as opt}
				<button
					onclick={() => apply(opt.value)}
					class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all
						{themeStore.preference === opt.value
							? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'}"
				>
					<span class="text-base">{opt.icon}</span>
					{opt.label}
					{#if themeStore.preference === opt.value}
						<span class="ml-auto text-xs">✓</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
