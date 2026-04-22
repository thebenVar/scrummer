<script lang="ts">
	import { tracker } from '$lib/stores/tracker.svelte';
	import StatusBadge from './StatusBadge.svelte';

	let clientInput = $state('');
	let projectInput = $state('');
	let taskInput = $state('');

	// Reactive derived list of projects for the autocomplete/datalist based on current client
	let availableProjects = $derived(tracker.getProjects(clientInput));
	let availableTasks = $derived(tracker.getTasks(clientInput, projectInput));

	let shiftProgressPercent = $derived(Math.min(100, Math.round((tracker.totalTodaySeconds / tracker.currentShiftGoalSeconds) * 100)));
	let userQueue = $derived(tracker.state.pausedTimers.filter(t => t.user === tracker.state.currentUser));

	let userInput = $state(tracker.state.currentUser);
	let assigneeInput = $state(tracker.state.currentUser);

	function handleUserChange() {
		if (userInput.trim()) {
			tracker.switchUser(userInput);
			userInput = tracker.state.currentUser; 
			assigneeInput = tracker.state.currentUser;
		}
	}

	function handleShiftChange(e: Event) {
		const val = Number((e.target as HTMLInputElement).value);
		if (!isNaN(val) && val > 0) {
			tracker.setShiftGoal(val);
		}
	}

	function handleAddPending() {
		if (!clientInput.trim() || !projectInput.trim() || !taskInput.trim() || !assigneeInput.trim()) return;
		const targetAssignee = assigneeInput.trim();
		tracker.addPendingTask(clientInput, projectInput, taskInput, targetAssignee);
		clientInput = '';
		projectInput = '';
		taskInput = '';
		assigneeInput = tracker.state.currentUser;
	}

	function handleStart() {
		if (!clientInput.trim() || !projectInput.trim() || !taskInput.trim() || !assigneeInput.trim()) return;
		if (assigneeInput.trim() !== tracker.state.currentUser) {
			tracker.switchUser(assigneeInput.trim());
			userInput = tracker.state.currentUser;
		}
		tracker.startTimer(clientInput, projectInput, taskInput);
		clientInput = '';
		projectInput = '';
		taskInput = '';
		assigneeInput = tracker.state.currentUser;
	}

	function handlePauseResume() {
		if (tracker.state.activeTimer?.running) {
			tracker.pauseTimer();
		} else {
			tracker.resumeTimer();
		}
	}

	function handleComplete() {
		tracker.completeTimer();
		clientInput = '';
		projectInput = '';
		taskInput = '';
	}

	function handleDiscard() {
		if (confirm('Are you sure you want to discard this session?')) {
			tracker.discardTimer();
			clientInput = '';
			projectInput = '';
			taskInput = '';
		}
	}

	// Timezone display
	const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
	let currentTime = $state(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));

	$effect(() => {
		const id = setInterval(() => {
			currentTime = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
		}, 60000); // update every minute
		return () => clearInterval(id);
	});
</script>

<div class="animate-fade-up mx-auto max-w-2xl">
	<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl dark:bg-slate-900/50">
		<!-- Shift Progress Bar & User Select -->
		<div class="border-b border-slate-200/50 bg-indigo-50/50 px-6 py-3 dark:border-white/5 dark:bg-indigo-900/20">
			<div class="flex items-center justify-between text-xs font-semibold text-indigo-800 dark:text-indigo-300">
				<div class="flex items-center gap-2">
					<label for="user" class="sr-only">User</label>
					<span class="text-lg">👤</span>
					<input 
						id="user" 
						type="text" 
						list="users-list"
						bind:value={userInput} 
						onchange={handleUserChange}
						class="w-32 bg-transparent pb-0.5 outline-none border-b border-indigo-200 transition-colors focus:border-indigo-500 dark:border-indigo-700/50 dark:focus:border-indigo-400 placeholder:text-indigo-400 dark:placeholder:text-indigo-500"
						placeholder="Username"
					/>
					<datalist id="users-list">
						{#each tracker.state.users as userOption}
							<option value={userOption}></option>
						{/each}
					</datalist>
				</div>
				<div class="flex items-center gap-1.5">
					<span>{tracker.formatDuration(tracker.totalTodaySeconds)} /</span>
					<input
						type="number"
						min="1"
						max="24"
						value={tracker.currentShiftGoalHours}
						onchange={handleShiftChange}
						class="w-10 rounded bg-white/50 px-1 py-0.5 text-center outline-none ring-1 ring-indigo-200 transition-all focus:ring-2 focus:ring-indigo-500/50 dark:bg-black/20 dark:ring-indigo-700/50"
						aria-label="Shift Goal (Hours)"
					/>
					<span>h ({shiftProgressPercent}%)</span>
				</div>
			</div>
			<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-200/50 dark:bg-indigo-900/50">
				<div 
					class="h-full rounded-full bg-indigo-600 transition-all duration-1000 ease-out dark:bg-indigo-400" 
					style="width: {shiftProgressPercent}%"
				></div>
			</div>
		</div>

		<!-- Header / Time Zone -->
		<div class="flex items-center justify-between border-b border-white/10 bg-slate-100/50 px-6 py-4 dark:bg-black/20">
			<h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Timer</h2>
			<div class="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
				<span>🌍</span>
				<span>{tzName}</span>
				<span class="mx-1 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
				<span>{currentTime}</span>
			</div>
		</div>

		<div class="p-6 sm:p-8">
			{#if tracker.state.activeTimer}
				<!-- Active Timer View -->
				<div class="flex flex-col items-center">
					<StatusBadge status={tracker.state.activeTimer.status} />

					<div class="mt-8 text-center">
						<p class="text-sm font-medium text-slate-500 dark:text-slate-400">
							{tracker.state.activeTimer.client} <span class="mx-1 text-slate-300 dark:text-slate-600">/</span> {tracker.state.activeTimer.project}
						</p>
						<h3 class="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">
							{tracker.state.activeTimer.task}
						</h3>
					</div>

					<div class="font-timer mt-10 text-6xl md:text-7xl font-light tracking-tight text-indigo-600 dark:text-indigo-400 {tracker.state.activeTimer.running ? 'animate-pulse-ring rounded-full' : ''}">
						{tracker.formatDuration(tracker.state.activeTimer.elapsedSeconds)}
					</div>

					<div class="mt-12 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
						<button
							onclick={handlePauseResume}
							class="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-slate-300 active:translate-y-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:ring-slate-600"
						>
							{#if tracker.state.activeTimer.running}
								⏸ Pause
							{:else}
								▶️ Resume
							{/if}
						</button>
						<button
							onclick={handleComplete}
							class="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-medium text-white shadow-md shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/40 active:translate-y-0"
						>
							✅ Complete & Save
						</button>
					</div>

					<button
						onclick={handleDiscard}
						class="mt-6 text-sm font-medium text-slate-400 underline decoration-slate-400/30 underline-offset-4 transition-colors hover:text-red-500 hover:decoration-red-500/50 dark:text-slate-500"
					>
						Discard session
					</button>
				</div>
			{:else}
				<!-- Input Form View -->
				<div class="flex flex-col gap-5">
					<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
						<!-- Client -->
						<div class="flex flex-col gap-1.5">
							<label for="client" class="text-sm font-medium text-slate-700 dark:text-slate-300">Client</label>
							<input
								id="client"
								type="text"
								list="clients-list"
								bind:value={clientInput}
								placeholder="e.g. Acme Corp"
								class="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							/>
							<datalist id="clients-list">
								{#each tracker.state.clients as client}
									<option value={client}></option>
								{/each}
							</datalist>
						</div>

						<!-- Project -->
						<div class="flex flex-col gap-1.5">
							<label for="project" class="text-sm font-medium text-slate-700 dark:text-slate-300">Project</label>
							<input
								id="project"
								type="text"
								list="projects-list"
								bind:value={projectInput}
								placeholder="e.g. Website Redesign"
								class="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							/>
							<datalist id="projects-list">
								{#each availableProjects as project}
									<option value={project}></option>
								{/each}
							</datalist>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 text-left">
						<!-- Assignee -->
						<div class="flex flex-col gap-1.5 object-left">
							<label for="assignee" class="text-sm font-medium text-slate-700 dark:text-slate-300">Assign To</label>
							<input
								id="assignee"
								type="text"
								list="users-list"
								bind:value={assigneeInput}
								placeholder="Username"
								class="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							/>
						</div>

						<!-- Task -->
						<div class="flex flex-col gap-1.5">
							<label for="task" class="text-sm font-medium text-slate-700 dark:text-slate-300">Task Name</label>
						<input
							id="task"
							type="text"
							list="tasks-list"
							bind:value={taskInput}
							placeholder="What are you working on?"
							class="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-base outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-white dark:focus:bg-slate-800"
							onkeydown={(e) => {
								if (e.key === 'Enter') handleStart();
							}}
						/>
						<datalist id="tasks-list">
							{#each availableTasks as taskOption}
								<option value={taskOption}></option>
							{/each}
						</datalist>
					</div>
					</div>

					<div class="mt-4 flex w-full flex-col gap-3 sm:flex-row">
						<button
							onclick={handleStart}
							disabled={!clientInput.trim() || !projectInput.trim() || !taskInput.trim() || !assigneeInput.trim()}
							class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-indigo-600/40 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
						>
							▶️ Start Timer
						</button>
						<button
							onclick={handleAddPending}
							disabled={!clientInput.trim() || !projectInput.trim() || !taskInput.trim() || !assigneeInput.trim()}
							class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-slate-300 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:ring-slate-600"
						>
							⏳ Add to Queue
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Queued Tasks Section -->
		{#if userQueue.length > 0}
			<div class="border-t border-slate-200/50 bg-slate-100/30 px-6 py-5 dark:border-white/5 dark:bg-black/10 sm:px-8">
				<h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Queued Tasks</h3>
				<div class="flex flex-col gap-3">
					{#each userQueue as taskItem (taskItem.id)}
						<div class="flex flex-col justify-between gap-3 rounded-xl border border-slate-200/50 bg-white p-4 shadow-sm transition-all hover:border-slate-300 dark:border-white/5 dark:bg-slate-800/80 dark:hover:border-white/10 sm:flex-row sm:items-center">
							<div class="flex flex-col">
								<div class="text-xs font-medium text-slate-500 dark:text-slate-400">
									{taskItem.client} <span class="mx-1 text-slate-300 dark:text-slate-600">/</span> {taskItem.project}
								</div>
								<div class="mt-0.5 flex items-center gap-2">
									<span class="text-sm font-semibold text-slate-800 dark:text-slate-100">{taskItem.task}</span>
									{#if taskItem.status === 'Pending'}
										<span class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">Pending</span>
									{:else}
										<span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">On Hold</span>
									{/if}
								</div>
							</div>
							<div class="flex items-center justify-between gap-4 sm:justify-end">
								<div class="font-timer text-lg font-medium tracking-tight text-indigo-600 dark:text-indigo-400">
									{tracker.formatDuration(taskItem.elapsedSeconds)}
								</div>
								<div class="flex gap-2">
									<button
										onclick={() => tracker.resumePausedTimer(taskItem.id)}
										class="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
									>
										<span>▶️</span> {taskItem.status === 'Pending' ? 'Start' : 'Resume'}
									</button>
									<button
										onclick={() => tracker.completePausedTimer(taskItem.id)}
										class="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
										title="Complete & Save"
									>
										<span>✅</span> Done
									</button>
									<button
										onclick={() => {
											if (confirm('Are you sure you want to discard this task?')) {
												tracker.discardPausedTimer(taskItem.id);
											}
										}}
										class="flex items-center justify-center rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
										title="Discard Session"
									>
										🗑️
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
