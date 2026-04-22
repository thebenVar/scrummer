<script lang="ts">
	import type { TaskStatus } from '$lib/stores/tracker.svelte';

	let { status }: { status: TaskStatus } = $props();

	const config: Record<TaskStatus, { label: string; classes: string }> = {
		Pending: {
			label: 'Pending',
			classes: 'bg-slate-500/20 text-slate-400 ring-slate-500/30'
		},
		'In Progress': {
			label: 'In Progress',
			classes: 'bg-indigo-500/20 text-indigo-400 ring-indigo-500/30'
		},
		'On Hold': {
			label: 'On Hold',
			classes: 'bg-amber-500/20 text-amber-400 ring-amber-500/30'
		},
		Completed: {
			label: 'Completed',
			classes: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30'
		}
	};

	const c = $derived(config[status]);
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 {c.classes}"
>
	{#if status === 'In Progress'}
		<span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400"></span>
	{/if}
	{c.label}
</span>
