# Backend Integration Guide

This document explains how to connect the frontend to a real Node.js/Express/MongoDB backend.

## Quick Start

### 1. Change API URL

Edit `.env`:
```
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### 2. Disable Mock API

Edit `.env`:
```
VITE_USE_MOCK_API=false
```

### 3. Start Frontend

```bash
npm run dev
```

That's it. The frontend will now consume real API endpoints.

---

## How It Works

### Architecture Flow

```
React Component
    ↓
React Query (hooks)
    ↓
Service Layer
    ↓
Repository Layer
    ↓
API Client (Axios) or Mock Repository
```

### Mock/API Switching

The switch happens in `src/repositories/index.ts`:

```typescript
const useMockApi = env.USE_MOCK_API;

export const mineRepository = useMockApi 
  ? mineMockRepository 
  : mineApiRepository;
```

Components never know which implementation is being used.

---

## Authentication

### How Login Works

1. User submits credentials
2. Frontend calls `POST /api/v1/auth/login`
3. Backend authenticates and sets session/JWT
4. Frontend stores user state in `authStore`

### Session Checking

On app load, frontend calls `GET /api/v1/auth/me` to verify session.

### 401 Handling

If any API returns 401, the Axios interceptor:
1. Clears auth state
2. Redirects to `/login`

### Cookie-Based Auth (Recommended)

The Axios client is configured with `withCredentials: true`. This allows:
- HttpOnly secure cookies
- Session-based authentication
- No localStorage JWT storage

---

## API Client Configuration

Located at `src/api/client.ts`:

```typescript
const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});
```

### Custom Headers

If your backend requires specific headers, add them in the request interceptor.

---

## Response Normalization

The frontend expects responses in this format:

```json
{
  "success": true,
  "message": "Request successful",
  "data": {},
  "meta": {}
}
```

If your backend uses a different format, modify the service layer to normalize responses.

---

## Pagination

The frontend expects pagination metadata:

```json
{
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

---

## File Uploads

### Current Implementation

File uploads are prepared but not fully implemented.

### When Backend Is Ready

1. The service layer should convert file data to `FormData`
2. Use `multipart/form-data` content type
3. Backend should use Multer or similar middleware

Example:
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('name', 'Document Name');
formData.append('category', 'Certificate');
```

---

## RBAC Integration

### Current Implementation

Frontend has a simple permission system based on roles.

### When Backend Is Ready

1. Backend should return user permissions
2. Frontend `useAuth` hook already supports `hasPermission()` and `can()`
3. Update `src/hooks/useAuth.ts` to use real permissions from backend

---

## React Query Configuration

Located in `src/App.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});
```

Adjust these values based on your backend's performance characteristics.

---

## Error Handling

### Centralized Error Handling

Errors are handled in `src/api/errors.ts`:

- `400` - Validation errors shown to user
- `401` - Redirect to login
- `403` - Access denied message
- `404` - Not found message
- `500` - Server error message

### Custom Error Messages

If your backend returns different error structures, update `handleApiError()`.

---

## Query Keys

All query keys are centralized in `src/hooks/useMines.ts`:

```typescript
export const queryKeys = {
  mines: {
    all: ['mines'] as const,
    detail: (id: string) => ['mines', id] as const,
  },
  // ...
};
```

This ensures cache invalidation works correctly.

---

## Cache Invalidation

After mutations, relevant queries are automatically invalidated:

```typescript
const useCreateMine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mineService.createMine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mines.all });
    },
  });
};
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:5000/api/v1` |
| `VITE_APP_NAME` | Application name | `Smart Mine Governance` |
| `VITE_APP_ENV` | Environment | `development` |
| `VITE_USE_MOCK_API` | Use mock data | `true` |

---

## Common Integration Issues

### CORS Errors

Ensure your backend has CORS configured:
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
```

### Cookie Not Sending

Ensure:
1. `withCredentials: true` in Axios
2. Backend sets `SameSite=None; Secure` for production
3. Frontend and backend are on same domain or properly configured

### Response Format Mismatch

If your backend returns data differently:
1. Update the relevant service file
2. Normalize the response in the repository layer
3. Keep component logic unchanged