# Multi-Tenant GitHub Authentication System

## Overview

This system enables per-device, per-browser authentication for your Bun/Svelte application. Each device accessing the local network app independently authenticates with GitHub and sees only its own data.

## Architecture

```
Browser (Device 1)
├─ localStorage: GitHub PAT Token
└─ Fetch Requests → GitHub API (Direct)

Browser (Device 2)
├─ localStorage: Different GitHub PAT Token
└─ Fetch Requests → GitHub API (Direct)

Server (Bun)
└─ Serves frontend only (no token caching)
```

## Core Modules

### 1. **Token Storage** (`src/lib/auth/tokenStorage.ts`)

Manages GitHub Personal Access Token (PAT) storage in browser localStorage.

**Key Functions:**

- `storeToken(token, expiryHours?)` — Save token to localStorage
- `getToken()` — Retrieve token (returns `null` if expired or missing)
- `hasToken()` — Check if valid token exists
- `clearToken()` — Remove token from localStorage
- `validateToken(token)` — Verify token with GitHub API

**Example:**
```typescript
import { storeToken, getToken, hasToken } from '$lib/auth/tokenStorage';

// Store a token
storeToken('ghp_1234567890abcdef', 24); // expires in 24 hours

// Check if authenticated
if (hasToken()) {
  const token = getToken(); // "ghp_1234567890abcdef"
}
```

### 2. **GitHub API Client** (`src/lib/github/api.ts`)

Authenticated fetch utilities that automatically inject the user's token into requests.

**Key Functions:**

- `githubFetch<T>(endpoint, options)` — Generic fetch wrapper
- `githubGet<T>(endpoint)` — GET requests
- `githubPost<T>(endpoint, body)` — POST requests
- `githubPatch<T>(endpoint, body)` — PATCH requests
- `githubPut<T>(endpoint, body)` — PUT requests
- `githubDelete<T>(endpoint)` — DELETE requests

**Convenience Methods:**
- `getUserRepos()` — List user's repositories
- `getUserOrgs()` — List user's organizations
- `getUserProfile()` — Get authenticated user's info
- `getRepoIssues(owner, repo)` — Get repository issues

**Error Handling:**
- `GitHubAuthError` — Thrown on 401 (invalid token)
- `GitHubNotFoundError` — Thrown on 404
- Generic `Error` — For other failures

**Example:**
```typescript
import { getUserRepos, getRepoIssues } from '$lib/github/api';

try {
  // Get all repos for authenticated user
  const repos = await getUserRepos();
  console.log(repos); // Array of repo objects

  // Get issues from a specific repo
  const issues = await getRepoIssues('torvalds', 'linux');
  console.log(issues); // Array of issue objects
} catch (error) {
  if (error instanceof GitHubAuthError) {
    console.error('Token invalid:', error.message);
  }
}
```

### 3. **Auth Initialization** (`src/lib/auth/init.ts`)

Handles app-level authentication state management.

**Key Functions:**

- `initializeAuth()` — Check and validate token on app load
- `authenticateWithToken(token)` — Authenticate with new token
- `logout()` — Clear stored token
- `getAuthState()` — Get current auth state
- `onAuthStateChange(callback)` — Subscribe to auth state changes

**Auth State Object:**
```typescript
interface AuthState {
  isAuthenticated: boolean;   // true if valid token exists
  isLoading: boolean;        // true during validation
  error: string | null;      // Error message if any
}
```

**Example:**
```typescript
import { initializeAuth, onAuthStateChange, authenticateWithToken } from '$lib/auth/init';

// On app mount:
const state = await initializeAuth();
console.log(state.isAuthenticated); // true or false

// Subscribe to changes:
const unsubscribe = onAuthStateChange((state) => {
  if (state.isAuthenticated) {
    console.log('User authenticated');
  } else if (state.error) {
    console.error('Auth error:', state.error);
  }
});

// User enters token in UI:
await authenticateWithToken(userInputToken);
```

## Integration Flow

### Step 1: App Initialization

On app load, check for existing token:

```typescript
import { initializeAuth } from '$lib/auth/init';

onMount(async () => {
  const authState = await initializeAuth();

  if (!authState.isAuthenticated) {
    // Show login/token input UI
    showAuthPrompt = true;
  }
});
```

### Step 2: User Authentication

When user provides a token (via input or OAuth):

```typescript
import { authenticateWithToken } from '$lib/auth/init';

async function handleTokenSubmit(userToken: string) {
  const authState = await authenticateWithToken(userToken);

  if (authState.isAuthenticated) {
    // Token stored, proceed to app
  } else {
    // Show error
    errorMessage = authState.error;
  }
}
```

### Step 3: Fetch User Data

Once authenticated, fetch data directly from GitHub:

```typescript
import { getUserRepos, getUserOrgs } from '$lib/github/api';

async function loadUserData() {
  try {
    const repos = await getUserRepos();
    const orgs = await getUserOrgs();
    userRepos = repos;
    userOrgs = orgs;
  } catch (error) {
    console.error('Failed to load data:', error.message);
  }
}
```

### Step 4: Logout

Clear the token when user logs out:

```typescript
import { logout } from '$lib/auth/init';

function handleLogout() {
  logout();
  // Redirect to login or refresh page
}
```

## Security Considerations

1. **localStorage Scope**: Tokens are stored per-domain and per-protocol. Each device/browser instance is isolated.
2. **No Server Storage**: The server never sees or stores individual tokens.
3. **Token Expiry**: Optional expiry checking prevents stale tokens.
4. **HTTPS Only** (Production): Use HTTPS in production to prevent token interception.
5. **Scoped PATs**: Recommend users create GitHub PATs with minimal required permissions.

## Error Handling

### Typical Error Scenarios

```typescript
import { authenticateWithToken } from '$lib/auth/init';
import { getUserRepos, GitHubAuthError } from '$lib/github/api';

try {
  const state = await authenticateWithToken(token);
  if (!state.isAuthenticated) {
    // Invalid token
    console.error(state.error);
  }
} catch (error) {
  // Network or storage errors
  console.error('Setup failed:', error.message);
}

try {
  const repos = await getUserRepos();
} catch (error) {
  if (error instanceof GitHubAuthError) {
    // Token expired or invalid - logout and prompt re-auth
    logout();
  } else {
    // Network error - retry or show error
  }
}
```

## Server-Side Considerations

The Bun server can now be simplified:

1. **Remove Server Token Caching**: No longer needed
2. **Remove Hard-Coded Credentials**: Delete any hardcoded GitHub tokens/users
3. **Serve Frontend Only**: Bun serves the static assets and SvelteKit app
4. **Optional Pass-Through**: Can optionally keep server API routes for:
   - Proxying requests (for CORS bypass if needed)
   - Logging/analytics
   - Server-side operations not related to GitHub data fetching

## Testing the Implementation

### Manual Test Flow

1. **Device A**: Access `http://local-ip:5173`
2. **Enter Token A**: Paste GitHub PAT for user A
3. **Verify**: See User A's repos/orgs
4. **Device B**: Access same IP from different device/browser
5. **Enter Token B**: Paste different GitHub PAT for user B
6. **Verify**: See User B's repos/orgs (not A's)

Each device maintains independent state in its own localStorage.

## Migration from Server-Based Auth

### Before (Current)
- Server uses hardcoded token → all users see same data
- `/api/github/issues` endpoint uses server's GitHub credentials

### After
- Browser stores user's token → each user sees own data
- `/api/github/issues` endpoint can be removed or refactored to use client token
- Or: Create new endpoints that accept token in request body or header

### Recommended Refactoring Steps

1. Create authentication UI component (not in scope)
2. Call `initializeAuth()` in root layout
3. Conditionally render app or auth prompt based on `getAuthState()`
4. Replace server API calls with direct `githubFetch()` calls
5. Remove hardcoded tokens from server

## Files Included

- `src/lib/auth/tokenStorage.ts` — Token management
- `src/lib/auth/init.ts` — Auth state & initialization
- `src/lib/github/api.ts` — Authenticated GitHub API client
