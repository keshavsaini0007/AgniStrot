# Frontend Architecture

This document describes the overall frontend architecture.

## Overview

The frontend follows a layered architecture designed for backend integration:

```
React UI
    ↓
Hooks / Query Layer
    ↓
Service Layer
    ↓
Repository Layer
    ↓
API Client or Mock Repository
```

## Directory Structure

```
src/
├── api/                    # API client and configuration
│   ├── client.ts          # Axios instance
│   ├── endpoints.ts       # API endpoint constants
│   └── errors.ts          # Error handling
│
├── components/             # Reusable UI components
│   ├── ui/                # Base UI components
│   ├── layout/            # Layout components
│   ├── dashboard/         # Dashboard-specific
│   └── ...                # Feature-specific
│
├── config/                 # Configuration
│   └── env.ts             # Environment variables
│
├── hooks/                  # React Query hooks
│   ├── useAuth.ts
│   ├── useMines.ts
│   └── ...
│
├── layouts/                # Page layouts
│   ├── AppLayout.tsx
│   └── PublicLayout.tsx
│
├── mock/                   # Mock data
│   ├── database.ts
│   └── ...
│
├── pages/                  # Page components
│   ├── public/
│   ├── auth/
│   └── app/
│
├── repositories/           # Data access layer
│   ├── api/               # Real API
│   └── mock/              # Mock implementations
│
├── routes/                 # Route components
│   └── ProtectedRoute.tsx
│
├── services/               # Business logic
│   ├── authService.ts
│   └── ...
│
├── store/                  # State management
│   ├── authStore.ts
│   └── uiStore.ts
│
├── types/                  # TypeScript types
│   └── index.ts
│
└── utils/                  # Utilities
    ├── date.ts
    ├── status.ts
    └── roles.ts
```

## Key Principles

### 1. Separation of Concerns

- **Components**: Presentation only
- **Hooks**: Server state management
- **Services**: Business logic
- **Repositories**: Data access

### 2. Backend Ready

- No hard-coded URLs in components
- All data flows through services
- Mock/API switching at repository level

### 3. Type Safety

- TypeScript throughout
- Centralized type definitions
- Strict null checks

## Data Flow

### Server State (React Query)

```
Component
    ↓
useQuery / useMutation
    ↓
Service
    ↓
Repository
    ↓
API Client / Mock
```

### Client State (Zustand)

```
Component
    ↓
useStore
    ↓
Store
```

## State Management

### Server State

Use React Query for:
- API data
- Caching
- Loading states
- Error handling
- Refetching

### Client State

Use Zustand for:
- UI state (sidebar, modals)
- Auth state
- Theme
- Preferences

## Design System

### UI Components

Located in `src/components/ui/`:
- Button
- Card
- Badge
- Input
- Select
- Modal
- DataTable
- Pagination
- Skeleton
- EmptyState
- ErrorState

### Color System

```
Background: #0B0D0E
Surface:    #111416
Elevated:   #171A1D
Border:     #252A2D
Primary:    #F4F5F5
Secondary:  #A4ADB2
Muted:      #8D969B
Primary Accent: #D88A32
Success:    #35C759
Warning:    #F5B942
Danger:     #FF4D4F
Info:       #4DA3FF
AI:         #A78BFA
```

## Routing

### Public Routes

- `/` - Landing page
- `/login` - Login

### Protected Routes

- `/app/dashboard`
- `/app/mines`
- `/app/mines/:mineId`
- `/app/inspections`
- `/app/observations`
- `/app/corrective-actions`
- `/app/compliance`
- `/app/documents`
- `/app/analytics`
- `/app/gis`
- `/app/reports`
- `/app/notifications`
- `/app/users`
- `/app/audit-logs`
- `/app/settings`

## Performance

### Code Splitting

Consider lazy loading:
```typescript
const DashboardPage = React.lazy(() => import('./pages/app/DashboardPage'));
```

### Caching

React Query caches data automatically:
- Stale time: 5 minutes
- Retry: 1 attempt

### Optimizations

- Memoized components
- Virtual scrolling for large lists
- Image optimization
- Bundle splitting