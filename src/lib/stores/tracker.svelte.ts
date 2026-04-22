// ─── Types ──────────────────────────────────────────────────────────────────

export type TaskStatus = 'Pending' | 'In Progress' | 'On Hold' | 'Completed';

export interface WorkSession {
	id: string;
	user: string;
	client: string;
	project: string;
	task: string;
	status: TaskStatus;
	startTime: string; // ISO
	endTime: string; // ISO
	durationSeconds: number;
}

export interface ActiveTimer {
	id: string;
	user: string;
	client: string;
	project: string;
	task: string;
	status: TaskStatus;
	startTime: string; // ISO
	elapsedSeconds: number;
	running: boolean;
}

export interface TrackerState {
	sessions: WorkSession[];
	activeTimer: ActiveTimer | null;
	pausedTimers: ActiveTimer[];
	clients: string[];
	projects: Record<string, string[]>; // client -> projects[]
	knownTasks: Record<string, string[]>; // client::project -> tasks[]
	currentUser: string;
	users: string[];
	shiftGoals: Record<string, number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const STORAGE_KEY = 'work-tracker-state';

function loadState(): TrackerState {
	if (typeof localStorage === 'undefined') return defaultState();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultState();
		const parsed: TrackerState = JSON.parse(raw);
		// Restore paused timer correctly — never auto-resume
		if (parsed.activeTimer) {
			parsed.activeTimer.running = false;
		}
		if (!parsed.pausedTimers) {
			parsed.pausedTimers = [];
		}
		if (!parsed.knownTasks) {
			parsed.knownTasks = {};
		}
		if (!parsed.currentUser) parsed.currentUser = 'Default User';
		if (!parsed.users) parsed.users = [parsed.currentUser];
		if (!parsed.shiftGoals) parsed.shiftGoals = { [parsed.currentUser]: 8 };

		// Backward compatibility for users
		if (parsed.activeTimer && !parsed.activeTimer.user) parsed.activeTimer.user = parsed.currentUser;
		parsed.sessions.forEach(s => { if (!s.user) s.user = parsed.currentUser; });
		parsed.pausedTimers.forEach(t => { if (!t.user) t.user = parsed.currentUser; });

		return parsed;
	} catch {
		return defaultState();
	}
}

function defaultState(): TrackerState {
	return {
		sessions: [],
		activeTimer: null,
		pausedTimers: [],
		clients: [],
		projects: {},
		knownTasks: {},
		currentUser: 'Default User',
		users: ['Default User'],
		shiftGoals: { 'Default User': 8 }
	};
}

function saveState(state: TrackerState): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Store ───────────────────────────────────────────────────────────────────

function createTracker() {
	let state = $state<TrackerState>(defaultState());
	let intervalId: ReturnType<typeof setInterval> | null = null;

	// Initialise from localStorage (client-side only)
	function init() {
		state = loadState();
	}

	function persist() {
		saveState(state);
	}

	// ── User management ──

	function switchUser(name: string) {
		const trimmed = name.trim();
		if (!trimmed) return;
		if (!state.users.includes(trimmed)) {
			state.users = [...state.users, trimmed];
		}
		if (!(trimmed in state.shiftGoals)) {
			state.shiftGoals[trimmed] = 8;
		}
		
		if (state.activeTimer) {
			if (state.activeTimer.running) stopInterval();
			const toPause = { ...state.activeTimer, status: 'On Hold' as TaskStatus, running: false };
			state.pausedTimers = [toPause, ...state.pausedTimers];
			state.activeTimer = null;
		}
		state.currentUser = trimmed;
		persist();
	}

	function setShiftGoal(hours: number) {
		if (hours > 0) {
			state.shiftGoals[state.currentUser] = hours;
			persist();
		}
	}

	// ── Client / Project management ──

	function addClient(name: string) {
		const trimmed = name.trim();
		if (!trimmed || state.clients.includes(trimmed)) return;
		state.clients = [...state.clients, trimmed];
		if (!state.projects[trimmed]) state.projects = { ...state.projects, [trimmed]: [] };
		persist();
	}

	function addProject(client: string, project: string) {
		const trimmed = project.trim();
		if (!trimmed) return;
		const existing = state.projects[client] ?? [];
		if (existing.includes(trimmed)) return;
		state.projects = { ...state.projects, [client]: [...existing, trimmed] };
		persist();
	}

	function getProjects(client: string): string[] {
		return state.projects[client] ?? [];
	}

	function addTask(client: string, project: string, task: string) {
		const trimmedClient = client.trim();
		const trimmedProject = project.trim();
		const trimmedTask = task.trim();
		if (!trimmedTask) return;
		const key = `${trimmedClient}::${trimmedProject}`;
		const existing = state.knownTasks[key] ?? [];
		if (existing.includes(trimmedTask)) return;
		state.knownTasks = { ...state.knownTasks, [key]: [...existing, trimmedTask] };
		persist();
	}

	function getTasks(client: string, project: string): string[] {
		const key = `${client.trim()}::${project.trim()}`;
		return state.knownTasks[key] ?? [];
	}

	// ── Timer controls ──

	function startTimer(client: string, project: string, task: string) {
		if (!client.trim() || !project.trim() || !task.trim()) return;

		// Ensure client/project exist in lists
		addClient(client);
		addProject(client, project);
		addTask(client, project, task);

		if (state.activeTimer?.running) stopInterval();

		// If there is an active timer, move it to paused timers to avoid overwriting
		if (state.activeTimer) {
			const toPause = { ...state.activeTimer, status: 'On Hold' as TaskStatus, running: false };
			state.pausedTimers = [toPause, ...state.pausedTimers];
		}

		const now = new Date().toISOString();

		state.activeTimer = {
			id: generateId(),
			user: state.currentUser,
			client: client.trim(),
			project: project.trim(),
			task: task.trim(),
			status: 'In Progress',
			startTime: now,
			elapsedSeconds: 0,
			running: true
		};

		startInterval();
		persist();
	}

	function addPendingTask(client: string, project: string, task: string, assignee: string) {
		if (!client.trim() || !project.trim() || !task.trim() || !assignee.trim()) return;

		addClient(client);
		addProject(client, project);
		addTask(client, project, task);

		const assignedUser = assignee.trim();
		if (!state.users.includes(assignedUser)) {
			state.users = [...state.users, assignedUser];
			if (!(assignedUser in state.shiftGoals)) {
				state.shiftGoals[assignedUser] = 8;
			}
		}

		const now = new Date().toISOString();

		const newTask: ActiveTimer = {
			id: generateId(),
			user: assignedUser,
			client: client.trim(),
			project: project.trim(),
			task: task.trim(),
			status: 'Pending',
			startTime: now,
			elapsedSeconds: 0,
			running: false
		};

		state.pausedTimers = [newTask, ...state.pausedTimers];
		persist();
	}

	function pauseTimer() {
		if (!state.activeTimer || !state.activeTimer.running) return;
		stopInterval();
		state.activeTimer = { ...state.activeTimer, status: 'On Hold', running: false };
		persist();
	}

	function resumeTimer() {
		if (!state.activeTimer || state.activeTimer.running) return;
		state.activeTimer = { ...state.activeTimer, status: 'In Progress', running: true };
		startInterval();
		persist();
	}

	function completeTimer() {
		if (!state.activeTimer) return;
		stopInterval();

		const endTime = new Date().toISOString();
		const session: WorkSession = {
			id: generateId(),
			user: state.activeTimer.user,
			client: state.activeTimer.client,
			project: state.activeTimer.project,
			task: state.activeTimer.task,
			status: 'Completed',
			startTime: state.activeTimer.startTime,
			endTime,
			durationSeconds: state.activeTimer.elapsedSeconds
		};

		state.sessions = [session, ...state.sessions];
		state.activeTimer = null;
		persist();
	}

	function discardTimer() {
		if (!state.activeTimer) return;
		stopInterval();
		state.activeTimer = null;
		persist();
	}

	function resumePausedTimer(id: string) {
		const targetIdx = state.pausedTimers.findIndex(t => t.id === id);
		if (targetIdx === -1) return;

		const target = state.pausedTimers[targetIdx];
		const newPausedTimers = [...state.pausedTimers];
		newPausedTimers.splice(targetIdx, 1);
		
		if (state.activeTimer) {
			if (state.activeTimer.running) stopInterval();
			const toPause = { ...state.activeTimer, status: 'On Hold' as TaskStatus, running: false };
			newPausedTimers.unshift(toPause);
		}

		state.pausedTimers = newPausedTimers;
		state.activeTimer = { ...target, status: 'In Progress', running: true };
		startInterval();
		persist();
	}

	function completePausedTimer(id: string) {
		const targetIdx = state.pausedTimers.findIndex(t => t.id === id);
		if (targetIdx === -1) return;

		const target = state.pausedTimers[targetIdx];
		state.pausedTimers = state.pausedTimers.filter(t => t.id !== id);

		const session: WorkSession = {
			id: target.id || generateId(),
			user: target.user,
			client: target.client,
			project: target.project,
			task: target.task,
			status: 'Completed',
			startTime: target.startTime,
			endTime: new Date().toISOString(),
			durationSeconds: target.elapsedSeconds
		};

		state.sessions = [session, ...state.sessions];
		persist();
	}

	function discardPausedTimer(id: string) {
		state.pausedTimers = state.pausedTimers.filter(t => t.id !== id);
		persist();
	}

	function deleteSession(id: string) {
		state.sessions = state.sessions.filter((s) => s.id !== id);
		persist();
	}

	function clearAll() {
		stopInterval();
		state = defaultState();
		persist();
	}

	// ── Interval helpers ──

	function startInterval() {
		if (intervalId !== null) clearInterval(intervalId);
		intervalId = setInterval(() => {
			if (state.activeTimer?.running) {
				state.activeTimer = {
					...state.activeTimer,
					elapsedSeconds: state.activeTimer.elapsedSeconds + 1
				};
				persist();
			}
		}, 1000);
	}

	function stopInterval() {
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function destroy() {
		stopInterval();
	}

	// ── Derived / computed ──

	function formatDuration(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
	}

	function isToday(isoString: string): boolean {
		if (!isoString) return false;
		const date = new Date(isoString);
		const today = new Date();
		return date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear();
	}

	// Report: grouped by user > client > project > task
	function getReport(): ReportUser[] {
		const map = new Map<string, Map<string, Map<string, Map<string, number>>>>();

		for (const s of state.sessions) {
			if (!map.has(s.user)) map.set(s.user, new Map());
			const clientMap = map.get(s.user)!;
			if (!clientMap.has(s.client)) clientMap.set(s.client, new Map());
			const pMap = clientMap.get(s.client)!;
			if (!pMap.has(s.project)) pMap.set(s.project, new Map());
			const tMap = pMap.get(s.project)!;
			tMap.set(s.task, (tMap.get(s.task) ?? 0) + s.durationSeconds);
		}

		const report: ReportUser[] = [];
		for (const [user, clientMap] of map) {
			const clients: ReportClient[] = [];
			let userTotal = 0;
			for (const [client, pMap] of clientMap) {
				const projects: ReportProject[] = [];
				let clientTotal = 0;
				for (const [project, tMap] of pMap) {
					const tasks: ReportTask[] = [];
					let projectTotal = 0;
					for (const [task, secs] of tMap) {
						tasks.push({ task, seconds: secs });
						projectTotal += secs;
					}
					projects.push({ project, seconds: projectTotal, tasks });
					clientTotal += projectTotal;
				}
				clients.push({ client, seconds: clientTotal, projects });
				userTotal += clientTotal;
			}
			report.push({ user, seconds: userTotal, clients });
		}
		return report;
	}

	function getUserTotalTodaySeconds(user: string): number {
		let total = 0;
		for (const s of state.sessions) {
			if (s.user === user && isToday(s.startTime)) total += s.durationSeconds;
		}
		if (state.activeTimer && state.activeTimer.user === user && isToday(state.activeTimer.startTime)) {
			total += state.activeTimer.elapsedSeconds;
		}
		for (const pt of state.pausedTimers) {
			if (pt.user === user && isToday(pt.startTime)) total += pt.elapsedSeconds;
		}
		return total;
	}

	function getUserShiftGoalHours(user: string): number {
		return state.shiftGoals[user] || 8;
	}

	function setUserShiftGoal(user: string, hours: number) {
		if (hours > 0) {
			state.shiftGoals[user] = hours;
			persist();
		}
	}

	return {
		get state() { return state; },
		get totalTodaySeconds() {
			return getUserTotalTodaySeconds(state.currentUser);
		},
		get currentShiftGoalSeconds() {
			return getUserShiftGoalHours(state.currentUser) * 3600;
		},
		get currentShiftGoalHours() {
			return getUserShiftGoalHours(state.currentUser);
		},
		init,
		switchUser,
		setShiftGoal,
		addClient,
		addProject,
		getProjects,
		addTask,
		getTasks,
		startTimer,
		addPendingTask,
		pauseTimer,
		resumeTimer,
		resumePausedTimer,
		completePausedTimer,
		discardPausedTimer,
		completeTimer,
		discardTimer,
		deleteSession,
		clearAll,
		destroy,
		formatDuration,
		getReport,
		getUserTotalTodaySeconds,
		getUserShiftGoalHours,
		setUserShiftGoal
	};
}

export const tracker = createTracker();

// ─── Report types ─────────────────────────────────────────────────────────────

export interface ReportTask {
	task: string;
	seconds: number;
}
export interface ReportProject {
	project: string;
	seconds: number;
	tasks: ReportTask[];
}
export interface ReportClient {
	client: string;
	seconds: number;
	projects: ReportProject[];
}
export interface ReportUser {
	user: string;
	seconds: number;
	clients: ReportClient[];
}
