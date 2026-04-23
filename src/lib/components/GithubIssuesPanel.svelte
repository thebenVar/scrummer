<script lang="ts">
	import type { GithubIssue } from '$lib/github/types';
	import { tracker } from '$lib/stores/tracker.svelte';
	import { githubStore } from '$lib/stores/github.svelte';
	import GithubIssueCreateModal from './GithubIssueCreateModal.svelte';

	let { issues = [] }: { issues?: GithubIssue[] } = $props();

	let owner = $state('');
	let repo = $state('');
	let search = $state('');
	let showCreateModal = $state(false);

	const displayedIssues = $derived(issues.length > 0 ? issues : githubStore.filteredIssues);

	$effect(() => {
		githubStore.setQuery(search);
	});

	function formatDisplayDate(iso: string | null): string {
		if (!iso) return 'n/a';
		const date = new Date(iso);
		if (Number.isNaN(date.getTime())) return 'n/a';
		return date.toISOString().slice(0, 10);
	}

	function startFromIssue(issue: GithubIssue) {
		tracker.startTimerFromGithubIssue(issue, tracker.state.currentUser);
	}

	async function loadIssues() {
		if (!owner.trim() || !repo.trim()) return;
		githubStore.startLoading();
		try {
			const response = await fetch(`/api/github/issues?owner=${encodeURIComponent(owner.trim())}&repo=${encodeURIComponent(repo.trim())}`);
			const payload = await response.json();
			if (!response.ok) throw new Error(payload.error ?? 'Failed to load issues');
			githubStore.setIssues(payload.issues ?? []);
		} catch (e: any) {
			githubStore.setError(e?.message ?? 'Failed to load issues');
		} finally {
			githubStore.endLoading();
		}
	}
</script>

<div class="mx-auto max-w-6xl">
	<div class="mb-6 flex items-center justify-between gap-3">
		<h2 class="text-xl font-bold">GitHub Issues</h2>
		<button aria-label="Add GitHub Task" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" onclick={() => (showCreateModal = true)}>
			Add GitHub Task
		</button>
	</div>

	<div class="mb-4 grid grid-cols-1 gap-3 rounded-xl border bg-white p-4 dark:bg-slate-900 sm:grid-cols-4">
		<input class="rounded border px-3 py-2 text-sm" placeholder="Owner" bind:value={owner} />
		<input class="rounded border px-3 py-2 text-sm" placeholder="Repo" bind:value={repo} />
		<input class="rounded border px-3 py-2 text-sm sm:col-span-1" placeholder="Search issues" bind:value={search} />
		<button class="rounded bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900" onclick={loadIssues}>
			{githubStore.loading ? 'Loading...' : 'Load Issues'}
		</button>
	</div>

	{#if githubStore.error}
		<div class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
			{githubStore.error}
			<button class="ml-3 underline" onclick={loadIssues}>Retry</button>
		</div>
	{/if}

	<div class="space-y-3">
		{#if displayedIssues.length === 0}
			<div class="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No issues loaded.</div>
		{:else}
			{#each displayedIssues as issue (issue.number)}
				<div class="rounded-xl border bg-white p-4 dark:bg-slate-900">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-sm font-semibold">#{issue.number} {issue.title}</p>
							<p class="mt-1 text-xs text-slate-500">State: {issue.state}</p>
							<p class="mt-1 text-xs text-slate-500">Assignees: {issue.assignees.length ? issue.assignees.join(', ') : 'none'}</p>
							<p class="mt-1 text-xs text-slate-500">Milestone: {issue.milestone ?? 'none'}</p>
							<p class="mt-1 text-xs text-slate-500">Created: {formatDisplayDate(issue.createdAt)}</p>
							<p class="mt-1 text-xs text-slate-500">Updated: {formatDisplayDate(issue.updatedAt)}</p>
							<div class="mt-2 flex flex-wrap gap-2 text-xs">
								{#each issue.labels as label}
									<span class="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{label}</span>
								{/each}
							</div>
						</div>
						<div class="flex gap-2">
							<a class="rounded border px-3 py-2 text-xs" href={issue.url} target="_blank" rel="noreferrer">Open</a>
							<button aria-label={`Start #${issue.number}`} class="rounded bg-indigo-600 px-3 py-2 text-xs text-white" onclick={() => startFromIssue(issue)}>
								Start
							</button>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<GithubIssueCreateModal
	open={showCreateModal}
	onClose={() => (showCreateModal = false)}
	onCreated={async () => {
		await loadIssues();
	}}
/>
