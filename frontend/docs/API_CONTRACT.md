# API Contract

This document describes the REST API endpoints that the frontend is designed to consume.

## Base URL

```
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

## Authentication

### Login
```
POST /api/v1/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "usr-001",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "mine_officer",
      "department": "Mining Operations"
    }
  }
}
```

### Logout
```
POST /api/v1/auth/logout
```

### Get Current User
```
GET /api/v1/auth/me
```

### Refresh Token
```
POST /api/v1/auth/refresh
```

---

## Mines

### Get All Mines
```
GET /api/v1/mines
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search term
- `status` (string): Filter by status
- `sortBy` (string): Sort field
- `sortOrder` (string): 'asc' or 'desc'

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "mine-001",
      "name": "Rajpur Coal Mine",
      "code": "RCM-001",
      "location": {
        "address": "Rajpur, Jharkhand, India",
        "latitude": 23.3441,
        "longitude": 85.3096
      },
      "status": "active",
      "complianceRate": 87.5,
      "riskScore": 72,
      "openObservations": 12,
      "overdueActions": 3
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 118,
    "totalPages": 12
  }
}
```

### Get Mine by ID
```
GET /api/v1/mines/:id
```

### Create Mine
```
POST /api/v1/mines
```

### Update Mine
```
PATCH /api/v1/mines/:id
```

### Delete Mine
```
DELETE /api/v1/mines/:id
```

---

## Inspections

### Get All Inspections
```
GET /api/v1/inspections
```

**Query Parameters:**
- `page`, `limit`, `mineId`, `status`, `type`

### Get Inspection by ID
```
GET /api/v1/inspections/:id
```

### Create Inspection
```
POST /api/v1/inspections
```

### Update Inspection
```
PATCH /api/v1/inspections/:id
```

---

## Observations

### Get All Observations
```
GET /api/v1/observations
```

**Query Parameters:**
- `page`, `limit`, `mineId`, `inspectionId`, `severity`, `status`, `category`

### Get Observation by ID
```
GET /api/v1/observations/:id
```

### Create Observation
```
POST /api/v1/observations
```

### Update Observation
```
PATCH /api/v1/observations/:id
```

---

## Corrective Actions

### Get All Corrective Actions
```
GET /api/v1/corrective-actions
```

**Query Parameters:**
- `page`, `limit`, `mineId`, `observationId`, `status`, `priority`

### Get Corrective Action by ID
```
GET /api/v1/corrective-actions/:id
```

### Create Corrective Action
```
POST /api/v1/corrective-actions
```

### Update Corrective Action
```
PATCH /api/v1/corrective-actions/:id
```

---

## Compliance

### Get All Compliance Requirements
```
GET /api/v1/compliance
```

**Query Parameters:**
- `page`, `limit`, `mineId`, `status`, `category`

### Get Compliance by ID
```
GET /api/v1/compliance/:id
```

### Create Compliance
```
POST /api/v1/compliance
```

### Update Compliance
```
PATCH /api/v1/compliance/:id
```

---

## Documents

### Get All Documents
```
GET /api/v1/documents
```

### Get Document by ID
```
GET /api/v1/documents/:id
```

### Upload Document
```
POST /api/v1/documents
Content-Type: multipart/form-data
```

### Delete Document
```
DELETE /api/v1/documents/:id
```

---

## Notifications

### Get All Notifications
```
GET /api/v1/notifications
```

**Query Parameters:**
- `page`, `limit`, `userId`, `read`

### Mark Notification as Read
```
PATCH /api/v1/notifications/:id/read
```

### Mark All as Read
```
PATCH /api/v1/notifications/read-all
```

---

## Analytics

### Get Dashboard Analytics
```
GET /api/v1/analytics/dashboard
```

### Get Compliance Analytics
```
GET /api/v1/analytics/compliance
```

### Get Risk Analytics
```
GET /api/v1/analytics/risk
```

### Get Inspection Analytics
```
GET /api/v1/analytics/inspections
```

---

## GIS

### Get Mines Geo Data
```
GET /api/v1/gis/mines
```

### Get Observations Geo Data
```
GET /api/v1/gis/observations
```

---

## Reports

### Generate Report
```
POST /api/v1/reports/generate
```

**Request:**
```json
{
  "type": "compliance",
  "mineId": "mine-001",
  "startDate": "2026-01-01",
  "endDate": "2026-09-30",
  "format": "pdf"
}
```

### Get All Reports
```
GET /api/v1/reports
```

### Get Report by ID
```
GET /api/v1/reports/:id
```

---

## Users

### Get All Users
```
GET /api/v1/users
```

### Get User by ID
```
GET /api/v1/users/:id
```

### Create User
```
POST /api/v1/users
```

### Update User
```
PATCH /api/v1/users/:id
```

### Delete User
```
DELETE /api/v1/users/:id
```

---

## Audit Logs

### Get All Audit Logs
```
GET /api/v1/audit-logs
```

### Get Audit Log by ID
```
GET /api/v1/audit-logs/:id
```

---

## Error Response Format

```json
{
  "success": false,
  "message": "Something went wrong",
  "errors": [],
  "code": "VALIDATION_ERROR"
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Rate Limited
- `500` - Server Error