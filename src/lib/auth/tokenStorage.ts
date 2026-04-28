/**
 * Secure token storage utilities for GitHub PAT (Personal Access Token)
 * All tokens are stored in browser's localStorage per device/browser session
 */

const TOKEN_KEY = 'github_pat_token';
const TOKEN_EXPIRY_KEY = 'github_pat_token_expiry';

/**
 * Stores a GitHub PAT in localStorage
 * @param token GitHub Personal Access Token
 * @param expiryHours Optional expiry time in hours (default: never expires in this implementation)
 */
export function storeToken(token: string, expiryHours?: number): void {
	if (!token?.trim()) {
		throw new Error('Token cannot be empty');
	}

	try {
		localStorage.setItem(TOKEN_KEY, token);

		if (expiryHours) {
			const expiryTime = Date.now() + expiryHours * 60 * 60 * 1000;
			localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiryTime));
		} else {
			localStorage.removeItem(TOKEN_EXPIRY_KEY);
		}
	} catch (error) {
		throw new Error(`Failed to store token: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Retrieves the stored GitHub PAT from localStorage
 * @returns Token string or null if not found or expired
 */
export function getToken(): string | null {
	try {
		const token = localStorage.getItem(TOKEN_KEY);

		if (!token) {
			return null;
		}

		// Check expiry
		const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
		if (expiryTime) {
			const expiry = parseInt(expiryTime, 10);
			// Only clear token if expiry is a valid number AND has passed
			if (!isNaN(expiry) && Date.now() > expiry) {
				clearToken();
				return null;
			}
		}

		return token;
	} catch (error) {
		console.error(`Failed to retrieve token: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
}

/**
 * Checks if a valid token exists in localStorage
 * @returns true if token exists and is not expired
 */
export function hasToken(): boolean {
	return getToken() !== null;
}

/**
 * Clears the stored token from localStorage
 */
export function clearToken(): void {
	try {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(TOKEN_EXPIRY_KEY);
	} catch (error) {
		console.error(`Failed to clear token: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Validates a token by attempting to fetch the authenticated user's info
 * @param token Token to validate
 * @returns true if token is valid, false otherwise
 */
export async function validateToken(token: string): Promise<boolean> {
	try {
		const response = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github.v3+json'
			}
		});

		return response.ok;
	} catch (error) {
		console.error(`Token validation failed: ${error instanceof Error ? error.message : String(error)}`);
		return false;
	}
}
