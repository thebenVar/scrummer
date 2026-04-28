/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storeToken, getToken, hasToken, clearToken, validateToken } from './tokenStorage';

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
})();

Object.defineProperty(global, 'localStorage', {
	value: localStorageMock,
	writable: true
});

describe('tokenStorage', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		localStorage.clear();
	});

	describe('storeToken()', () => {
		it('should save token to localStorage', () => {
			const token = 'ghp_test123';
			storeToken(token);
			expect(localStorage.getItem('github_pat_token')).toBe(token);
		});

		it('should throw error on empty token', () => {
			expect(() => storeToken('')).toThrow('Token cannot be empty');
			expect(() => storeToken('   ')).toThrow('Token cannot be empty');
		});

		it('should save expiry time when provided', () => {
			const token = 'ghp_test123';
			storeToken(token, 24);
			const expiryStr = localStorage.getItem('github_pat_token_expiry');
			expect(expiryStr).not.toBeNull();
			const expiryTime = parseInt(expiryStr!, 10);
			const now = Date.now();
			// Should be roughly 24 hours in future (within 1 second tolerance)
			expect(expiryTime).toBeGreaterThan(now + 23.99 * 60 * 60 * 1000);
			expect(expiryTime).toBeLessThan(now + 24.01 * 60 * 60 * 1000);
		});

		it('should clear expiry when not provided', () => {
			storeToken('token1', 24);
			expect(localStorage.getItem('github_pat_token_expiry')).not.toBeNull();
			storeToken('token2');
			expect(localStorage.getItem('github_pat_token_expiry')).toBeNull();
		});
	});

	describe('getToken()', () => {
		it('should return stored token', () => {
			const token = 'ghp_test123';
			localStorage.setItem('github_pat_token', token);
			expect(getToken()).toBe(token);
		});

		it('should return null if token not stored', () => {
			expect(getToken()).toBeNull();
		});

		it('should return null if token expired', () => {
			const token = 'ghp_test123';
			const pastTime = Date.now() - 1000; // 1 second ago
			localStorage.setItem('github_pat_token', token);
			localStorage.setItem('github_pat_token_expiry', String(pastTime));
			expect(getToken()).toBeNull();
		});

		it('should clear expired token from storage', () => {
			const token = 'ghp_test123';
			const pastTime = Date.now() - 1000;
			localStorage.setItem('github_pat_token', token);
			localStorage.setItem('github_pat_token_expiry', String(pastTime));
			getToken();
			expect(localStorage.getItem('github_pat_token')).toBeNull();
			expect(localStorage.getItem('github_pat_token_expiry')).toBeNull();
		});

		it('should return token if not expired', () => {
			const token = 'ghp_test123';
			const futureTime = Date.now() + 60 * 60 * 1000; // 1 hour from now
			localStorage.setItem('github_pat_token', token);
			localStorage.setItem('github_pat_token_expiry', String(futureTime));
			expect(getToken()).toBe(token);
		});

		it('should handle invalid expiry format gracefully', () => {
			const token = 'ghp_test123';
			localStorage.setItem('github_pat_token', token);
			localStorage.setItem('github_pat_token_expiry', 'invalid-number');
			expect(getToken()).toBe(token); // Should return token even with invalid expiry
		});
	});

	describe('hasToken()', () => {
		it('should return true when valid token exists', () => {
			localStorage.setItem('github_pat_token', 'ghp_test123');
			expect(hasToken()).toBe(true);
		});

		it('should return false when token missing', () => {
			expect(hasToken()).toBe(false);
		});

		it('should return false when token expired', () => {
			const pastTime = Date.now() - 1000;
			localStorage.setItem('github_pat_token', 'ghp_test123');
			localStorage.setItem('github_pat_token_expiry', String(pastTime));
			expect(hasToken()).toBe(false);
		});
	});

	describe('clearToken()', () => {
		it('should remove token from localStorage', () => {
			localStorage.setItem('github_pat_token', 'ghp_test123');
			clearToken();
			expect(localStorage.getItem('github_pat_token')).toBeNull();
		});

		it('should remove expiry from localStorage', () => {
			localStorage.setItem('github_pat_token_expiry', String(Date.now() + 3600000));
			clearToken();
			expect(localStorage.getItem('github_pat_token_expiry')).toBeNull();
		});

		it('should not throw error if token not stored', () => {
			expect(() => clearToken()).not.toThrow();
		});
	});

	describe('validateToken()', () => {
		it('should call GitHub /user endpoint', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce({ ok: true });
			global.fetch = mockFetch;

			await validateToken('ghp_test123');

			expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/user', {
				headers: {
					Authorization: 'Bearer ghp_test123',
					Accept: 'application/vnd.github.v3+json'
				}
			});
		});

		it('should return true for valid token', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce({ ok: true });
			global.fetch = mockFetch;

			const result = await validateToken('ghp_test123');
			expect(result).toBe(true);
		});

		it('should return false for invalid token', async () => {
			const mockFetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 401 });
			global.fetch = mockFetch;

			const result = await validateToken('ghp_invalid');
			expect(result).toBe(false);
		});

		it('should return false on network error', async () => {
			const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
			global.fetch = mockFetch;

			const result = await validateToken('ghp_test123');
			expect(result).toBe(false);
		});
	});
});
