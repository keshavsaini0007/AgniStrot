# Role-Based Access Control

This document describes the RBAC architecture.

## Overview

The frontend implements a permission system for:
- Navigation visibility
- Button visibility
- Route access

**Note:** Frontend RBAC is for UX only. Actual authorization must be enforced by the backend.

## Roles

| Role | Description |
|------|-------------|
| `system_admin` | Full system access |
| `mine_officer` | Mine operations management |
| `field_inspector` | Inspections and observations |
| `department_officer` | Departmental operations |
| `contractor` | Contractor operations |
| `corporate_management` | Corporate oversight |
| `regulatory_authority` | Regulatory compliance |
| `auditor` | Audit and review |

## Permission Model

Permissions follow the format:
```
resource.action
```

Examples:
- `mines.read`
- `observations.create`
- `inspections.update`
- `users.delete`

## Using Permissions

### In Components

```typescript
import { useAuth } from '@/hooks/useAuth';

export const SomeComponent = () => {
  const { can, hasPermission, user } = useAuth();

  // Check specific permission
  if (hasPermission('observations.create')) {
    return <Button>Create Observation</Button>;
  }

  // Check resource action
  if (can('observation', 'create')) {
    return <Button>Create Observation</Button>;
  }

  // Check role directly
  if (user?.role === 'system_admin') {
    return <AdminPanel />;
  }

  return <ViewOnlyPanel />;
};
```

### For Navigation

Add permission requirements to navigation items:

```typescript
const navigation = [
  { 
    name: 'Users', 
    href: '/app/users', 
    icon: Users,
    requiredPermission: 'users.read'
  },
  // ...
];
```

### For Routes

Wrap routes with permission checks:

```typescript
<ProtectedRoute requiredPermission="users.read">
  <UsersPage />
</ProtectedRoute>
```

## Default Permissions by Role

### System Admin
- All permissions

### Mine Officer
- `mines.read`
- `inspections.read`
- `observations.read`
- `corrective_actions.read`
- `compliance.read`

### Field Inspector
- `inspections.create`
- `observations.create`
- `observations.read`

### Department Officer
- `corrective_actions.read`
- `corrective_actions.update`

### Corporate Management
- `mines.read`
- `inspections.read`
- `observations.read`
- `analytics.read`

### Regulatory Authority
- `mines.read`
- `inspections.read`
- `compliance.read`

### Auditor
- `audit_logs.read`
- `mines.read`
- `inspections.read`

### Contractor
- `corrective_actions.read`
- `documents.read`

## Backend Integration

### When Backend Is Ready

1. Backend returns user permissions
2. Update `useAuth` hook to use real permissions
3. Remove hardcoded permission mapping

Example:
```typescript
const useAuth = () => {
  const { user } = useAuthStore();
  
  const hasPermission = (permission: string) => {
    if (!user) return false;
    return user.permissions?.includes(permission) || false;
  };

  return { hasPermission, ... };
};
```

## Security Notes

### Frontend Limitations

Frontend RBAC is **visual only**:
- Hides UI elements
- Prevents navigation
- Shows/hides buttons

### Backend Enforcement

The backend must independently enforce:
- Authentication
- Authorization
- Resource ownership
- Input validation

**Never rely on frontend RBAC for security.**