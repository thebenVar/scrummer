/**
 * Application authentication initialization
 * Handles device-level token validation and state management on app load
 */

import { hasToken, getToken, clearToken, validateToken } from './tokenStorage';

export interface AuthState {
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}

let authState: AuthState = {
	isAuthenticated: false,
	isLoading: true,
	error: null
};

let listeners: Array<(state: AuthState) => void> = [];

/**
 * Subscribe to auth state changes
 * @param callback Function called when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: (state: AuthState) => void): () => void {
	listeners.push(callback);
	return () => {
		listeners = listeners.filter((l) => l !== callback);
	};
}

/**
 * Get current auth state
 */
export function getAuthState(): AuthState {
	return { ...authState };
}

/**
 * Notify all listeners of auth state change
 */
function notifyListeners(): void {
	listeners.forEach((listener) => listener({ ...authState }));
}

/**
 * Initialize authentication on app load
 * - Checks if token exists in localStorage
 * - Validates token with GitHub API
 * - Sets auth state accordingly
 *
 * Call this once on app initialization
 */
export async function initializeAuth(): Promise<AuthState> {
	authState = { isAuthenticated: false, isLoading: true, error: null };
	notifyListeners();

	try {
		// Check if token exists
		if (!hasToken()) {
			authState = { isAuthenticated: false, isLoading: false, error: null };
			notifyListeners();
			return authState;
		}

		// Validate token with GitHub
		const token = getToken();
		if (!token) {
			authState = { isAuthenticated: false, isLoading: false, error: null };
			notifyListeners();
			return authState;
		}

		const isValid = await validateToken(token);

		if (isValid) {
			authState = { isAuthenticated: true, isLoading: false, error: null };
		} else {
			clearToken();
			authState = {
				isAuthenticated: false,
				isLoading: false,
				error: 'Token is invalid or expired. Please authenticate again.'
			};
		}

		notifyListeners();
		return authState;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		authState = {
			isAuthenticated: false,
			isLoading: false,
			error: `Authentication check failed: ${errorMessage}`
		};
		notifyListeners();
		return authState;
	}
}

/**
 * Attempt to authenticate with a token
 * @param token GitHub PAT to authenticate with
 */
export async function authenticateWithToken(token: string): Promise<AuthState> {
	authState = { isAuthenticated: false, isLoading: true, error: null };
	notifyListeners();

	try {
		const isValid = await validateToken(token);

		if (!isValid) {
			authState = {
				isAuthenticated: false,
				isLoading: false,
				error: 'Invalid GitHub token. Please check and try again.'
			};
			notifyListeners();
			return authState;
		}

		// Token is valid, store it
		try {
			const { storeToken } = await import('./tokenStorage');
			storeToken(token);
		} catch (storageError) {
			const message = storageError instanceof Error ? storageError.message : String(storageError);
			authState = {
				isAuthenticated: false,
				isLoading: false,
				error: `Failed to store token: ${message}`
			};
			notifyListeners();
			return authState;
		}

		authState = { isAuthenticated: true, isLoading: false, error: null };
		notifyListeners();
		return authState;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		authState = {
			isAuthenticated: false,
			isLoading: false,
			error: `Authentication failed: ${errorMessage}`
		};
		notifyListeners();
		return authState;
	}
}

/**
 * Logout and clear token
 */
export function logout(): void {
	clearToken();
	authState = { isAuthenticated: false, isLoading: false, error: null };
	notifyListeners();
}
