# Auth Flow — Frontend

## Route

| Path | Component | PageGuard | Description |
|------|-----------|-----------|-------------|
| `/login` | `LoginPage` | Public (redirect if logged in) | Login form |
| `/403` | `ForbiddenPage` | Public | Access denied |
| `/` | `RootRedirect` | `ProtectedRoute` | Redirect based on role |
| All others | Various | `ProtectedRoute` + `PageGuard` | Role-based access |

## Page — LoginPage

**File:** `features/auth/pages/login-page.tsx`

```mermaid
graph TD
    A[LoginPage] --> B[Username input]
    A --> C[Password input]
    A --> D[Login button]
    D --> E[useLogin mutation]
    E --> F[POST /auth/login]
    F --> G{Success?}
    G -->|Yes| H[Store user in auth-store]
    H --> I[Redirect to /]
    G -->|No| J[Show error toast]
```

## Auth Store

**File:** `store/auth-store.ts` (Zustand)

| State | Description |
|-------|-------------|
| `user` | Current user object (id, username, role, fullName) |
| `token` | JWT access token (stored in memory + localStorage) |
| `login(user, token)` | Set user + token |
| `logout()` | Clear user + token, call `POST /auth/logout` |
| `hasRole(roles[])` | Check if user's role is in the allowed list |

## Protected Route

**File:** `layouts/protected-route.tsx`

```mermaid
graph TD
    A[ProtectedRoute] --> B{user exists?}
    B -->|No| C[Redirect /login]
    B -->|Yes| D{PageGuard allows role?}
    D -->|Yes| E[Render <AppShell> + <Outlet>]
    D -->|No| F[Render <ForbiddenPage>]
    E --> G[Sidebar]
    E --> H[Topbar]
    E --> I[Content]
```

## Root Redirect

**File:** (in `routes/index.tsx` — `RootRedirect`)

| User role | Redirect to |
|-----------|-------------|
| STOCK | `/stock/units` |
| SALES | `/stock/exports` |
| MANAGER | `/` → Dashboard |
| ADMIN | `/` → Dashboard |

## HTTP Client — Auth Interceptor

**File:** `utils/http-client.ts`

```mermaid
graph TD
    A[axios request] --> B{Has token?}
    B -->|Yes| C[Attach Authorization: Bearer header]
    B -->|No| D[Send without token]
    C --> E[Send request]
    E --> F{Response 401?}
    F -->|No| G[Return response]
    F -->|Yes| H{Refresh queue running?}
    H -->|No| I[POST /auth/refresh-token]
    I --> J{Refresh success?}
    J -->|Yes| K[Update token + retry original]
    J -->|No| L[Logout + redirect /login]
    H -->|Yes| M[Queue original request,<br/>wait for refresh]
    M --> N[Retry with new token]
```

## Service

**File:** `services/auth-service.ts`

| Function | API | Description |
|----------|-----|-------------|
| `login(data)` | `POST /auth/login` | Returns JWT + user info |
| `logout()` | `POST /auth/logout` | Clear server-side refresh cookie |
| `refreshToken()` | `POST /auth/refresh-token` | Refresh access token (reads cookie) |

**File:** `services/user-service.ts`

| Function | API | Description |
|----------|-----|-------------|
| `getAll(params)` | `GET /user` | List users (ADMIN only) |
| `getById(id)` | `GET /user/{id}` | User detail |
| `create(data)` | `POST /user` | Create user |
| `updateInfo(id, data)` | `PUT /user/{id}/info` | Update profile |
| `updateStatus(id, status)` | `PUT /user/{id}/status` | Toggle active |
| `updateRole(id, role)` | `PUT /user/{id}/role` | Change role |
| `resetPassword(id)` | `PUT /auth/{id}/reset-password` | Force reset |

## Permission Constants

**File:** `utils/permissions.ts`

```typescript
ROLES = {
  ADMIN:                ["ADMIN"],
  MANAGER:              ["MANAGER"],
  CAN_VIEW_REPORTS:     ["MANAGER", "ADMIN"],
  CAN_APPROVE:          ["MANAGER", "ADMIN"],
  CAN_MANAGE_CATALOG:   ["MANAGER"],
  CAN_MANAGE_SYSTEM:    ["ADMIN"],
  CAN_OPERATE_STOCK:    ["MANAGER", "STOCK"],
  CAN_VIEW_INVENTORY:   ["MANAGER", "ADMIN", "STOCK"],
  CAN_OPERATE:          ["SALES", "STOCK", "MANAGER", "ADMIN"],
}
```

## Sidebar — Role-based nav filtering

**File:** `layouts/sidebar.tsx` + `utils/navigation.ts`

```mermaid
graph LR
    subgraph "Role → allowed nav items"
        direction LR
        NW[filterNavItems] --> NR[Nav rules by role]
        NR --> N1[Import → STOCK/MANAGER]
        NR --> N2[Export → SALES/STOCK/MANAGER]
        NR --> N3[Return → SALES/MANAGER]
        NR --> N4[Warranty → SALES/STOCK/MANAGER]
        NR --> N5[Stock check → STOCK/MANAGER]
        NR --> N6[Adjustments → STOCK/MANAGER]
        NR --> N7[Price adjust → all]
        NR --> N8[PO → MANAGER]
        NR --> N9[Products → MANAGER/ADMIN/STOCK]
        NR --> N10[Users → ADMIN]
        NR --> N11[Audit → MANAGER/ADMIN]
        NR --> N12[Reports → MANAGER/ADMIN]
    end

    NW --> OP[Output: filtered sidebar items]
```

## Component Tree — Auth System

```mermaid
graph TD
    subgraph "Public"
        LP[LoginPage]
        LP --> LS[AuthService.login]
    end

    subgraph "Route protection"
        PR[ProtectedRoute]
        PR --> PG[PageGuard]
        PG --> PERM[permissions.ts]
    end

    subgraph "Post-login shell"
        APP[AppShell]
        APP --> SB[Sidebar]
        APP --> TB[Topbar]
        SB --> NAV[filterNavItems]
        TB --> LO[Logout button]
    end

    subgraph "Shared state"
        AST[Zustand auth-store]
        AST --> US[user state]
        AST --> TK[token state]
        AST --> HR[hasRole helper]
    end

    subgraph "API layer"
        HC[HttpClient axios]
        HC --> RI[Response interceptor]
        RI --> RF[Auto refresh on 401]
    end

    LP --> AST
    PR --> AST
    TB --> AST
    HC --> AST
```