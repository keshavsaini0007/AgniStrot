# Mock API Documentation

This document explains how the mock API layer works and how to switch to a real backend.

## Overview

The frontend includes a complete mock API layer that simulates backend behavior. This allows development and testing without a real backend.

## Configuration

### Enable Mock API

In `.env`:
```
VITE_USE_MOCK_API=true
```

### Disable Mock API

In `.env`:
```
VITE_USE_MOCK_API=false
```

## How It Works

### Repository Pattern

The application uses a repository pattern:

```
src/repositories/
├── index.ts          # Switches between mock and API
├── api/              # Real API implementations
│   ├── authApiRepository.ts
│   └── mineApiRepository.ts
└── mock/             # Mock implementations
    ├── authMockRepository.ts
    ├── mineMockRepository.ts
    └── ...
```

### Switching Logic

In `src/repositories/index.ts`:

```typescript
const useMockApi = env.USE_MOCK_API;

export const mineRepository = useMockApi 
  ? mineMockRepository 
  : mineApiRepository;
```

### Components Are Unaware

Components never know which implementation is used:

```typescript
// This works with both mock and real API
const { data } = useMines();
```

## Mock Data

### Centralized Database

All mock data is stored in `src/mock/database.ts`:

- Users
- Mines
- Inspections
- Observations
- Corrective Actions
- Compliance
- Documents
- Notifications
- Audit Logs

### Data Consistency

Mock data maintains relationships:
- Observations reference mines
- Corrective actions reference observations
- Compliance requirements reference mines

## Mock Behavior

### Simulated Delays

Mock repositories include artificial delays:
- GET requests: 300-400ms
- POST requests: 500ms
- PUT/PATCH requests: 400ms
- DELETE requests: 400ms

This helps test loading states.

### CRUD Operations

Mock repositories support:
- List with filtering and pagination
- Get by ID
- Create
- Update
- Delete

### Local State

Mock data is stored in memory. Changes persist during the session but reset on page reload.

## Demo Mode

### Available Demo Accounts

| Email | Role |
|-------|------|
| rahul@coalindia.com | Mine Officer |
| priya@coalindia.com | Corporate Management |
| amit@coalindia.com | Field Inspector |
| admin@coalindia.com | System Admin |
| neha@coalindia.com | Department Officer |

### Demo Workflow

1. Login as `rahul@coalindia.com`
2. View Dashboard with KPIs
3. Navigate to Mines
4. View mine details
5. Check observations
6. Track corrective actions

## Adding New Mock Data

### Step 1: Add to Database

Edit `src/mock/database.ts`:

```typescript
export const mockNewEntity = [
  {
    id: 'new-001',
    name: 'Example',
    // ... other fields
  },
];
```

### Step 2: Create Repository

Create `src/repositories/mock/newEntityMockRepository.ts`:

```typescript
import { mockNewEntity, delay } from '@/mock/database';

let entities = [...mockNewEntity];

export const newEntityMockRepository = {
  getEntities: async (params?) => {
    await delay(400);
    // Implement filtering and pagination
    return { success: true, data: [], meta: {} };
  },
  // ... other methods
};
```

### Step 3: Update Repository Index

Edit `src/repositories/index.ts`:

```typescript
export const newEntityRepository = useMockApi 
  ? newEntityMockRepository 
  : newEntityApiRepository;
```

## Switching to Real Backend

When ready to connect the real backend:

1. Implement the API endpoints as documented in `API_CONTRACT.md`
2. Create API repositories in `src/repositories/api/`
3. Set `VITE_USE_MOCK_API=false`
4. Set `VITE_API_BASE_URL` to your backend URL

The UI will continue working without changes.