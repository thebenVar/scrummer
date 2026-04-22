/**
 * Theme store — manages Light / Dark / System preference.
 * Persists to localStorage and listens to OS media query changes.
 */

type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'wtt-theme';

class ThemeStore {
	/** The user's explicit preference. */
	preference = $state<Theme>('system');

	/** Tracks the OS-level dark-mode setting. */
	private _systemDark = $state(false);

	/** The actually applied mode (resolves 'system' to 'light' or 'dark'). */
	get isDark(): boolean {
		if (this.preference === 'system') return this._systemDark;
		return this.preference === 'dark';
	}

	/** Must be called once, client-side (e.g. in a layout $effect). */
	init() {
		if (typeof window === 'undefined') return;

		// Restore saved preference
		const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
		if (saved && ['light', 'dark', 'system'].includes(saved)) {
			this.preference = saved;
		}

		// Track OS preference
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		this._systemDark = mq.matches;
		mq.addEventListener('change', (e) => {
			this._systemDark = e.matches;
		});
	}

	/** Update the preference and persist it. */
	set(theme: Theme) {
		this.preference = theme;
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, theme);
		}
	}
}

export const themeStore = new ThemeStore();
