/**
 * Timer store — manages the active timer session.
 * Uses setInterval for tick counting and persists state to localStorage
 * so an active session survives a page refresh.
 */

import { tasksStore } from './tasks.svelte';

const ACTIVE_KEY = 'wtt-active';

export interface ActiveTask {
	client: string;
	project: string;
	task: string;
}

class TimerStore {
	elapsed = $state(0); // seconds elapsed in current session
	running = $state(false);
	activeTask = $state<ActiveTask | null>(null);
	sessionStart = $state<number | null>(null); // wall-clock ms when session began

	private _iid: ReturnType<typeof setInterval> | null = null;

	/** Formatted elapsed time as HH:MM:SS. */
	get formatted(): string {
		const h = Math.floor(this.elapsed / 3600)
			.toString()
			.padStart(2, '0');
		const m = Math.floor((this.elapsed % 3600) / 60)
			.toString()
			.padStart(2, '0');
		const s = (this.elapsed % 60).toString().padStart(2, '0');
		return `${h}:${m}:${s}`;
	}

	/** idle | running | paused */
	get status(): 'idle' | 'running' | 'paused' {
		if (!this.activeTask) return 'idle';
		return this.running ? 'running' : 'paused';
	}

	/** Restore persisted timer state (called once client-side). */
	init() {
		if (typeof window === 'undefined') return;
		try {
			const raw = localStorage.getItem(ACTIVE_KEY);
			if (raw) {
				const d = JSON.parse(raw);
				this.elapsed = d.elapsed ?? 0;
				this.activeTask = d.activeTask ?? null;
				this.sessionStart = d.sessionStart ?? null;
				// Restore as paused — user must manually resume
			}
		} catch {
			// Ignore
		}
	}

	/** Start a new session for the given task. */
	start(task: ActiveTask) {
		this.activeTask = task;
		if (!this.sessionStart) {
			this.sessionStart = Date.now();
		}
		this._beginTicking();
	}

	/** Resume a paused session. */
	resume() {
		if (!this.activeTask || this.running) return;
		this._beginTicking();
	}

	/** Pause the running timer. */
	pause() {
		if (!this.running) return;
		this.running = false;
		this._clearInterval();
		this._persist();
	}

	/** Save the session as Completed and reset. */
	complete() {
		if (!this.activeTask) return;
		const endTime = Date.now();
		const startTime = this.sessionStart ?? endTime - this.elapsed * 1000;

		tasksStore.addSession({
			client: this.activeTask.client,
			project: this.activeTask.project,
			task: this.activeTask.task,
			status: 'completed',
			startTime,
			endTime,
			duration: this.elapsed
		});

		this._reset(true);
	}

	/** Discard the current session without saving. */
	cancel() {
		this._reset(true);
	}

	/** Cleanup: must be called onDestroy to avoid memory leaks. */
	cleanup() {
		this._clearInterval();
	}

	// ─── Private helpers ──────────────────────────────────────────────

	private _beginTicking() {
		this.running = true;
		this._iid = setInterval(() => {
			this.elapsed++;
			this._persist();
		}, 1000);
	}

	private _clearInterval() {
		if (this._iid !== null) {
			clearInterval(this._iid);
			this._iid = null;
		}
	}

	private _reset(clearStorage = false) {
		this.running = false;
		this._clearInterval();
		this.elapsed = 0;
		this.activeTask = null;
		this.sessionStart = null;
		if (clearStorage && typeof window !== 'undefined') {
			localStorage.removeItem(ACTIVE_KEY);
		}
	}

	private _persist() {
		if (typeof window === 'undefined') return;
		localStorage.setItem(
			ACTIVE_KEY,
			JSON.stringify({
				elapsed: this.elapsed,
				activeTask: this.activeTask,
				sessionStart: this.sessionStart
			})
		);
	}
}

export const timerStore = new TimerStore();
