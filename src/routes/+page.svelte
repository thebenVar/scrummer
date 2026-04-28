<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { tracker } from '$lib/stores/tracker.svelte';
	import { initializeAuth, getAuthState, authenticateWithToken, onAuthStateChange } from '$lib/auth/init';
	import NavBar from '$lib/components/NavBar.svelte';
	import TimerPanel from '$lib/components/TimerPanel.svelte';
	import LogsPanel from '$lib/components/LogsPanel.svelte';
	import ReportsPanel from '$lib/components/ReportsPanel.svelte';
	import GithubIssuesPanel from '$lib/components/GithubIssuesPanel.svelte';

	let activeTab = $state('timer');
	let authState = $state(getAuthState());
	let tokenInput = $state('');
	const TAB_KEY = 'worktrack_active_tab';

	onMount(async () => {
		// Initialize authentication on app load
		await initializeAuth();
		authState = getAuthState();

		// Subscribe to auth state changes
		const unsubscribe = onAuthStateChange((newState) => {
			authState = newState;
		});

		// Load persisted tab
		const savedTab = localStorage.getItem(TAB_KEY);
		if (savedTab) activeTab = savedTab;

		// Initialize the tracker state (loads from localStorage)
		tracker.init();

		return () => unsubscribe();
	});

	async function handleTokenSubmit(e: Event) {
		e.preventDefault();
		if (!tokenInput.trim()) return;

		const state = await authenticateWithToken(tokenInput.trim());
		if (state.isAuthenticated) {
			tokenInput = '';
		}
	}

	$effect(() => {
		// Persist tab on change
		localStorage.setItem(TAB_KEY, activeTab);
	});

	onDestroy(() => {
		// Clean up the interval when the component is destroyed
		tracker.destroy();
	});
</script>

<svelte:head>
	<title>WorkTrack - Advanced Time & Task Manager</title>
	<meta name="description" content="Manage your time and tasks efficiently with WorkTrack." />
</svelte:head>

{#if !authState.isAuthenticated}
	<!-- Authentication Prompt -->
	<div class="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
		<div class="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900">
			<h1 class="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Authenticate with GitHub</h1>
			<p class="mb-6 text-sm text-slate-600 dark:text-slate-400">
				Enter your GitHub Personal Access Token to use this app. Your token is stored securely in your browser only.
			</p>
			{#if authState.error}
				<div class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
					{authState.error}
				</div>
			{/if}
			<form onsubmit={handleTokenSubmit}>
				<div class="mb-4">
					<label for="token" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
						GitHub Personal Access Token
					</label>
					<input
						id="token"
						type="password"
						placeholder="ghp_..."
						bind:value={tokenInput}
						class="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
					/>
				</div>
				<button
					type="submit"
					disabled={authState.isLoading || !tokenInput.trim()}
					class="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
				>
					{authState.isLoading ? 'Authenticating...' : 'Authenticate'}
				</button>
			</form>
		</div>
	</div>
{:else}
	<!-- Main App UI -->
	<div class="flex h-screen w-full flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 lg:flex-row">
		<!-- Navigation Sidebar/Top/Bottom -->
		<NavBar bind:activeTab />

		<!-- Main Content Area -->
		<div class="flex-1 overflow-y-auto pb-24 pt-4 lg:pb-8 lg:pt-8 w-full">
			<main class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				<!-- Header logic -->
				<div class="mb-8 hidden lg:block">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
						{#if activeTab === 'timer'}
							Dashboard
						{:else if activeTab === 'logs'}
							Work History
						{:else if activeTab === 'reports'}
							Analytics
						{:else if activeTab === 'github'}
							GitHub Tracking
						{/if}
					</h1>
					<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
						{#if activeTab === 'timer'}
							Track your time across clients and projects.
						{:else if activeTab === 'logs'}
							Review your completed work sessions.
						{:else if activeTab === 'reports'}
							Analyze your time distribution.
						{:else if activeTab === 'github'}
							Load GitHub issues, start timers from issues, and create new backlog items.
						{/if}
					</p>
				</div>

				<!-- Dynamic Panel Content -->
				{#if activeTab === 'timer'}
					<TimerPanel />
				{:else if activeTab === 'logs'}
					<LogsPanel />
				{:else if activeTab === 'reports'}
					<ReportsPanel />
				{:else if activeTab === 'github'}
					<GithubIssuesPanel />
				{/if}
			</main>
		</div>
	</div>
{/if}
