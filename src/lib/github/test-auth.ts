/**
 * Test utility for debugging authentication issues
 * This file can be used to clear tokens and test the authentication flow
 */

import { getGitHubToken, removeGitHubToken, getAuthState } from './auth';
import { checkAuthentication } from './auth-manager';

/**
 * Clear any existing GitHub token and reset authentication state
 */
export function clearExistingAuth(): void {
  console.log('🧹 Clearing existing authentication...');
  const token = getGitHubToken();
  if (token) {
    console.log('🧹 Found existing token, removing it');
    removeGitHubToken();
  } else {
    console.log('🧹 No existing token found');
  }
}

/**
 * Test the complete authentication flow
 */
export async function testAuthFlow(): Promise<void> {
  console.log('🧪 Testing authentication flow...');
  
  // Check current state
  const currentState = getAuthState();
  console.log('🧪 Current auth state:', currentState);
  
  // Test authentication check
  try {
    const authResult = await checkAuthentication();
    console.log('🧪 Authentication check result:', authResult);
  } catch (error) {
    console.error('🧪 Authentication check failed:', error);
  }
}

/**
 * Force logout and clear all auth data
 */
export function forceLogout(): void {
  console.log('🚪 Forcing logout...');
  clearExistingAuth();
  
  // Clear any other auth-related data
  try {
    localStorage.removeItem('github_pat');
    console.log('🚪 Cleared github_pat from localStorage');
  } catch (error) {
    console.error('🚪 Failed to clear github_pat:', error);
  }
  
  try {
    // Clear any session storage items
    sessionStorage.clear();
    console.log('🚪 Cleared sessionStorage');
  } catch (error) {
    console.error('🚪 Failed to clear sessionStorage:', error);
  }
}

// Add this to the global window object for easy debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).testAuth = {
    clearExistingAuth,
    testAuthFlow,
    forceLogout,
    getCurrentToken: getGitHubToken,
    getAuthState
  };
  
  console.log('🧪 Auth test utilities available at window.testAuth');
}
