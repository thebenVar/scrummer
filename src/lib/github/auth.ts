/**
 * GitHub Authentication Utilities
 * Manages per-device GitHub Personal Access Tokens stored in localStorage
 */

const GITHUB_TOKEN_KEY = 'github_pat';

export interface GitHubAuthState {
  isAuthenticated: boolean;
  token: string | null;
}

/**
 * Store GitHub Personal Access Token in localStorage
 * @param token - GitHub Personal Access Token
 */
export function storeGitHubToken(token: string): void {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid GitHub token provided');
  }
  
  try {
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store GitHub token:', error);
    throw new Error('Unable to store authentication token');
  }
}

/**
 * Retrieve GitHub Personal Access Token from localStorage
 * @returns GitHub token or null if not found
 */
export function getGitHubToken(): string | null {
  try {
    return localStorage.getItem(GITHUB_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to retrieve GitHub token:', error);
    return null;
  }
}

/**
 * Remove GitHub Personal Access Token from localStorage
 * @returns true if token was removed, false if no token existed
 */
export function removeGitHubToken(): boolean {
  try {
    const token = localStorage.getItem(GITHUB_TOKEN_KEY);
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    return token !== null;
  } catch (error) {
    console.error('Failed to remove GitHub token:', error);
    return false;
  }
}

/**
 * Check current authentication state
 * @returns Authentication state object
 */
export function getAuthState(): GitHubAuthState {
  const token = getGitHubToken();
  return {
    isAuthenticated: !!token,
    token
  };
}

/**
 * Validate GitHub token format (basic validation)
 * @param token - GitHub token to validate
 * @returns true if token appears valid
 */
export function validateGitHubToken(token: string): boolean {
  // GitHub PATs are typically 40+ characters and start with 'ghp_' for classic tokens
  // or 'github_pat_' for fine-grained tokens
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  return (
    token.startsWith('ghp_') && token.length >= 40 ||
    token.startsWith('github_pat_') && token.length >= 60
  );
}

/**
 * Store validated GitHub token
 * @param token - GitHub token to validate and store
 * @throws Error if token is invalid
 */
export function authenticateWithToken(token: string): void {
  if (!validateGitHubToken(token)) {
    throw new Error('Invalid GitHub token format');
  }
  
  storeGitHubToken(token);
}
