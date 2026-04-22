/**
 * Tasks store — manages logged sessions, known clients/projects,
 * and computed report data. All state is persisted to localStorage.
 */

export type TaskStatus = 'pending' | 'in-progress' | 'on-hold' | 'completed';

export interface Session {
	id: string;
	client: string;
	project: string;
	task: string;
	status: TaskStatus;
	startTime: number; // ms timestamp
	endTime: number; // ms timestamp
	duration: number; // seconds
}

export interface ReportTask {
	task: string;
	duration: number;
}
export interface ReportProject {
	project: string;
	total: number;
	tasks: ReportTask[];
}
export interface ReportClient {
	client: string;
	total: number;
	projects: ReportProject[];
}

const SESSIONS_KEY = 'wtt-sessions';
const META_KEY = 'wtt-meta';

class TasksStore {
	sessions = $state<Session[]>([]);
	clients = $state<string[]>([]);
	projectsByClient = $state<Record<string, string[]>>({});

	/** Must be called once client-side to hydrate from localStorage. */
	init() {
		if (typeof window === 'undefined') return;
		try {
			const s = localStorage.getItem(SESSIONS_KEY);
			if (s) this.sessions = JSON.parse(s);

			const m = localStorage.getItem(META_KEY);
			if (m) {
				const parsed = JSON.parse(m);
				this.clients = parsed.clients ?? [];
				this.projectsByClient = parsed.projectsByClient ?? {};
			}
		} catch {
			// Ignore malformed data
		}
	}

	/** Add a completed session and update known clients/projects. */
	addSession(data: Omit<Session, 'id'>): Session {
		const session: Session = { ...data, id: crypto.randomUUID() };
		// Prepend so newest appears first
		this.sessions = [session, ...this.sessions];
		this._registerClientProject(data.client, data.project);
		this._saveSessions();
		return session;
	}

	/** Computed report data: Client → Project → Task → total seconds.
	 *  Reactive: re-evaluates whenever `sessions` changes.
	 */
	get clientTotals(): ReportClient[] {
		// Group sessions by client → project → task
		const grouped: Record<string, Record<string, Record<string, number>>> = {};

		for (const s of this.sessions) {
			if (!grouped[s.client]) grouped[s.client] = {};
			if (!grouped[s.client][s.project]) grouped[s.client][s.project] = {};
			grouped[s.client][s.project][s.task] =
				(grouped[s.client][s.project][s.task] ?? 0) + s.duration;
		}

		// Map into a typed structure with calculated totals
		return Object.entries(grouped).map(([client, projects]) => ({
			client,
			total: Object.values(projects).reduce(
				(sum, tasks) => sum + Object.values(tasks).reduce((s, d) => s + d, 0),
				0
			),
			projects: Object.entries(projects).map(([project, tasks]) => ({
				project,
				total: Object.values(tasks).reduce((s, d) => s + d, 0),
				tasks: Object.entries(tasks).map(([task, duration]) => ({ task, duration }))
			}))
		}));
	}

	// ─── Private helpers ─────────────────────────────────────────────

	private _registerClientProject(client: string, project: string) {
		if (!this.clients.includes(client)) {
			this.clients = [...this.clients, client];
		}
		const existing = this.projectsByClient[client] ?? [];
		if (!existing.includes(project)) {
			this.projectsByClient = {
				...this.projectsByClient,
				[client]: [...existing, project]
			};
		}
		this._saveMeta();
	}

	private _saveSessions() {
		if (typeof window === 'undefined') return;
		localStorage.setItem(SESSIONS_KEY, JSON.stringify(this.sessions));
	}

	private _saveMeta() {
		if (typeof window === 'undefined') return;
		localStorage.setItem(
			META_KEY,
			JSON.stringify({ clients: this.clients, projectsByClient: this.projectsByClient })
		);
	}
}

export const tasksStore = new TasksStore();
