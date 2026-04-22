<script lang="ts">
	type Theme = 'light' | 'dark' | 'system';

	let { placement = 'top' }: { placement?: 'top' | 'bottom' } = $props();

	let current = $state<Theme>('system');
	let isOpen = $state(false);

	function apply(theme: Theme) {
		current = theme;
		isOpen = false;
		localStorage.setItem('theme', theme);
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const useDark = theme === 'dark' || (theme === 'system' && prefersDark);
		document.documentElement.classList.toggle('dark', useDark);
	}

	$effect(() => {
		const saved = (localStorage.getItem('theme') as Theme) || 'system';
		apply(saved);

		// React to OS changes when in system mode
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => { if (current === 'system') apply('system'); };
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	const options: { value: Theme; icon: string; label: string }[] = [
		{ value: 'light', icon: '☀️', label: 'Light' },
		{ value: 'dark',  icon: '🌙', label: 'Dark'  },
		{ value: 'system',icon: '💻', label: 'System'}
	];

	let currentOption = $derived(options.find(o => o.value === current) || options[2]);
</script>

<div class="relative w-full" onmouseleave={() => isOpen = false} role="presentation">
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
						{current === opt.value
							? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
							: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'}"
				>
					<span class="text-base">{opt.icon}</span>
					{opt.label}
					{#if current === opt.value}
						<span class="ml-auto text-xs">✓</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
