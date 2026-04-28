# Multi-Tenant Authentication Architecture Flow

## System Overview

This diagram illustrates the multi-tenant authentication system where each device/browser independently authenticates with GitHub and accesses its own repositories and organizations.

## Authentication Flow Diagram

```mermaid
flowchart TD
    A[🌐 Device Access App] --> B{Check localStorage for GitHub Token}
    
    B -- Token Found --> C[Validate Token Format]
    B -- No Token --> D[Show Login Prompt]
    
    C --> E[API Test: GET /user]
    E --> F{API Response}
    
    F -- Success (200) --> G[✅ Authenticated<br/>Load User Data]
    F -- Unauthorized (401) --> H[❌ Token Invalid<br/>Clear localStorage]
    
    H --> D
    D --> I[User Enters GitHub PAT]
    I --> J[Validate Token Format]
    J --> K{Valid Format?}
    
    K -- Invalid --> L[Show Error Message]
    L --> I
    K -- Valid --> M[Store Token in localStorage]
    M --> N[API Test: GET /user]
    N --> O{API Response}
    
    O -- Success --> P[✅ Authenticated<br/>Hide Login<br/>Load Dashboard]
    O -- Failed --> Q[❌ API Error<br/>Clear Token]
    Q --> D
    
    G --> R[Fetch User Repos<br/>GET /user/repos]
    G --> S[Fetch User Orgs<br/>GET /user/orgs]
    G --> T[Load WorkTrack Dashboard]
    
    R --> U[Display User's Repositories]
    S --> V[Display User's Organizations]
    T --> W[Show Timer & Features]
    
    U --> X[User Can Start Timer from Issues]
    V --> X
    W --> X
```

## Data Flow Architecture

```mermaid
graph LR
    subgraph "Browser Device #1"
        A1[localStorage<br/>token_1] --> B1[GitHub API<br/>User_1 Data]
    end
    
    subgraph "Browser Device #2"
        A2[localStorage<br/>token_2] --> B2[GitHub API<br/>User_2 Data]
    end
    
    subgraph "Browser Device #N"
        AN[localStorage<br/>token_N] --> BN[GitHub API<br/>User_N Data]
    end
    
    subgraph "Bun Server"
        C[Static Files Only<br/>No Token Storage]
    end
    
    D[GitHub API<br/>api.github.com] --> B1
    D --> B2
    D --> BN
    
    C -.-> A1
    C -.-> A2
    C -.-> AN
```

## Component Interaction Diagram

```mermaid
classDiagram
    class AuthManager {
        +checkAuthentication()
        +initializeAuth()
        +shouldReAuthenticate()
        +logout()
    }
    
    class TokenStorage {
        +storeGitHubToken()
        +getGitHubToken()
        +removeGitHubToken()
        +validateGitHubToken()
    }
    
    class GitHubAPI {
        +githubFetch()
        +getUserRepos()
        +getUserOrgs()
        +getUserProfile()
    }
    
    class LoginFlow {
        +showLoginPrompt()
        +handleLogin()
        +handleLogout()
        +checkAuthOnInit()
    }
    
    class WorkTrackApp {
        +initialize()
        +renderDashboard()
        +showGitHubPanel()
    }
    
    WorkTrackApp --> AuthManager
    AuthManager --> TokenStorage
    AuthManager --> GitHubAPI
    WorkTrackApp --> LoginFlow
    LoginFlow --> TokenStorage
    LoginFlow --> AuthManager
    GitHubAPI --> TokenStorage
```

## Security & Isolation

```mermaid
graph TB
    subgraph "Device A Browser"
        LA[localStorage_A]
        TA[Token_A]
        SA[Session_A]
    end
    
    subgraph "Device B Browser"
        LB[localStorage_B]
        TB[Token_B]
        SB[Session_B]
    end
    
    subgraph "GitHub API"
        GA[User_A Data]
        GB[User_B Data]
    end
    
    subgraph "Bun Server"
        BS[Static Files<br/>No User Data]
    end
    
    TA --> GA
    TB --> GB
    
    LA -.-> TA
    LB -.-> TB
    
    BS --> LA
    BS --> LB
    
    LA -.x. LB
    TA -.x. TB
    SA -.x. SB
```

## User Journey Flow

```mermaid
journey
    title Multi-Tenant Authentication Journey
    section Device Access
      User opens app: 5: User
      App checks for token: 5: System
    section No Token Scenario
      Show login prompt: 5: System
      User enters PAT: 5: User
      Token validation: 5: System
      Store token: 5: System
      Load dashboard: 5: System
    section Existing Token Scenario
      Token found: 5: System
      Validate with API: 5: System
      Load user data: 5: System
      Show dashboard: 5: System
    section Daily Usage
      View own repos: 5: User
      Start timer from issue: 5: User
      Track time: 5: User
```

## Key Architecture Principles

1. **Client-Side Storage**: Each device stores its own token in localStorage
2. **Server Independence**: Bun server only serves static files, no authentication logic
3. **Direct API Access**: Browser communicates directly with GitHub API
4. **Token Isolation**: Tokens are completely isolated per device/browser
5. **Automatic Validation**: Tokens are validated on each app load
6. **Graceful Degradation**: Invalid tokens are automatically cleared and re-authentication is prompted
