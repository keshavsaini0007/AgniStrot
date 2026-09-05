# Authentication

This document describes the authentication architecture.

## Overview

The frontend supports:
- Session-based authentication (recommended)
- JWT token-based authentication

## Current Implementation

### Auth Store

Located at `src/store/authStore.ts`:

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
}
```

### Login Flow

```
1. User enters credentials
2. Frontend calls authService.login()
3. Service calls POST /api/v1/auth/login
4. Backend authenticates and sets session
5. Frontend stores user in authStore
6. Redirect to dashboard
```

### Session Check

On app load:
```
1. App mounts
2. fetchCurrentUser() called
3. Service calls GET /api/v1/auth/me
4. If successful: user stored, app renders
5. If failed: user cleared, login page shown
```

### Logout Flow

```
1. User clicks logout
2. Frontend calls authService.logout()
3. Service calls POST /api/v1/auth/logout
4. Backend clears session
5. Frontend clears auth state
6. Redirect to login
```

## Cookie-Based Authentication (Recommended)

### Configuration

Axios client is configured with:
```typescript
withCredentials: true
```

### Backend Requirements

Set cookies with:
```javascript
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
});
```

### Benefits

- No localStorage exposure
- HttpOnly prevents XSS
- Automatic cookie handling
- More secure

## JWT Token Authentication

### If Using Headers

Modify `src/api/client.ts`:

```typescript
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Token Storage

The frontend can store tokens in:
- HttpOnly cookies (recommended)
- localStorage (less secure)
- sessionStorage

## RBAC (Role-Based Access Control)

### Available Roles

- `system_admin` - Full access
- `mine_officer` - Mine operations
- `field_inspector` - Inspections
- `department_officer` - Department actions
- `contractor` - Limited access
- `corporate_management` - Read access
- `regulatory_authority` - Compliance read
- `auditor` - Audit logs read

### Using Permissions

In components:
```typescript
import { useAuth } from '@/hooks/useAuth';

const { can, hasPermission } = useAuth();

// Check specific permission
if (hasPermission('observations.create')) {
  // Show create button
}

// Check resource action
if (can('observation', 'create')) {
  // Show create button
}
```

### Route Protection

Protected routes require authentication:
```typescript
<ProtectedRoute>
  <AppLayout />
</ProtectedRoute>
```

### Navigation Visibility

Sidebar items are visible to all authenticated users. Add permission checks:

```typescript
{ name: 'Users', href: '/app/users', icon: Users, requiredPermission: 'users.read' }
```

## Error Handling

### 401 Unauthorized

The Axios interceptor handles 401:
```typescript
if (error.response?.status === 401) {
  window.location.href = '/login';
}
```

### Custom Error Messages

Auth errors are displayed in the login form:
```typescript
const { error, clearError } = useAuth();
// error contains the error message
```

## Integration with Backend

### Required Endpoints

1. `POST /api/v1/auth/login` - Login
2. `POST /api/v1/auth/logout` - Logout
3. `GET /api/v1/auth/me` - Get current user
4. `POST /api/v1/auth/refresh` - Refresh session

### Response Format

Login response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr-001",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "mine_officer"
    }
  }
}
```

Me response:
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```