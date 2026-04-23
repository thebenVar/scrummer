<script lang="ts">
	let {
		open = false,
		onClose,
		onCreated
	}: {
		open?: boolean;
		onClose?: () => void;
		onCreated?: () => void;
	} = $props();

	let owner = $state('');
	let repo = $state('');
	let title = $state('');
	let body = $state('');
	let mode = $state<'issue-only' | 'issue-and-project'>('issue-only');
	let projectId = $state('');
	let submitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	async function handleCreate() {
		if (!owner.trim() || !repo.trim() || !title.trim()) return;
		submitting = true;
		error = null;
		success = null;
		try {
			const response = await fetch('/api/github/issues/create', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					owner: owner.trim(),
					repo: repo.trim(),
					title: title.trim(),
					body: body.trim(),
					mode,
					projectId: mode === 'issue-and-project' ? projectId.trim() : undefined
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload.error ?? 'Failed to create issue');
			}

			success = `Created ${payload.url}`;
			onCreated?.();
		} catch (e: any) {
			error = e?.message ?? 'Failed to create issue';
		} finally {
			submitting = false;
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
		<div class="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Create GitHub Task</h3>
				<button type="button" onclick={() => onClose?.()} class="rounded px-2 py-1 text-sm">Close</button>
			</div>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div>
					<label for="gh-owner" class="mb-1 block text-sm">Owner</label>
					<input id="gh-owner" bind:value={owner} class="w-full rounded border px-3 py-2" />
				</div>
				<div>
					<label for="gh-repo" class="mb-1 block text-sm">Repo</label>
					<input id="gh-repo" bind:value={repo} class="w-full rounded border px-3 py-2" />
				</div>
			</div>

			<div class="mt-3">
				<label for="gh-title" class="mb-1 block text-sm">Title</label>
				<input id="gh-title" bind:value={title} class="w-full rounded border px-3 py-2" />
			</div>

			<div class="mt-3">
				<label for="gh-body" class="mb-1 block text-sm">Body</label>
				<textarea id="gh-body" bind:value={body} class="h-24 w-full rounded border px-3 py-2"></textarea>
			</div>

			<div class="mt-3">
				<label for="create-mode" class="mb-1 block text-sm">Mode</label>
				<select id="create-mode" bind:value={mode} class="w-full rounded border px-3 py-2">
					<option value="issue-only">Issue only</option>
					<option value="issue-and-project">Issue + Project</option>
				</select>
			</div>

			{#if mode === 'issue-and-project'}
				<div class="mt-3">
					<label for="project-id" class="mb-1 block text-sm">Project ID</label>
					<input id="project-id" bind:value={projectId} class="w-full rounded border px-3 py-2" />
				</div>
			{/if}

			{#if error}
				<p class="mt-3 text-sm text-red-600">{error}</p>
			{/if}
			{#if success}
				<p class="mt-3 text-sm text-emerald-600">{success}</p>
			{/if}

			<div class="mt-5 flex justify-end gap-2">
				<button type="button" onclick={() => onClose?.()} class="rounded border px-3 py-2 text-sm">Cancel</button>
				<button
					aria-label="Create"
					type="button"
					onclick={handleCreate}
					disabled={submitting || !owner.trim() || !repo.trim() || !title.trim()}
					class="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50"
				>
					{submitting ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}
