# ShiftMaster API Documentation - v1

## Base URL

```
https://your-domain.com/api/v1
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-01-31T12:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "field": "fieldName",
    "code": "ERROR_CODE"
  },
  "meta": {
    "timestamp": "2026-01-31T12:00:00.000Z"
  }
}
```

## Endpoints

---

## Authentication

### Register Worker

Create a new worker account.

**Endpoint**: `POST /api/v1/auth/register`

**Access**: Public

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "securePassword123",
  "role": "OPERATOR",
  "roles": ["crane_operator"],
  "certifications": ["NCCCO Crane Operator"]
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "message": "Worker registered successfully. Please verify your phone with the OTP sent via SMS.",
    "worker": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "OPERATOR",
      "roles": ["crane_operator"]
    }
  }
}
```

---

### Verify OTP

Verify phone number with OTP code.

**Endpoint**: `POST /api/v1/auth/verify-otp`

**Access**: Public

**Request Body**:
```json
{
  "phone": "+1234567890",
  "code": "123456"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Phone verified successfully",
    "worker": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "OPERATOR",
      "roles": ["crane_operator"]
    },
    "token": "jwt.token.here"
  }
}
```

---

### Login

Authenticate and receive JWT token.

**Endpoint**: `POST /api/v1/auth/login`

**Access**: Public

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

Or use phone:
```json
{
  "phone": "+1234567890",
  "password": "securePassword123"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "worker": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "OPERATOR",
      "roles": ["crane_operator"],
      "phoneVerified": true
    },
    "token": "jwt.token.here"
  }
}
```

---

### Get Profile

Get current authenticated user's profile.

**Endpoint**: `GET /api/v1/auth/profile`

**Access**: Protected

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "worker": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "role": "OPERATOR",
      "roles": ["crane_operator"],
      "certifications": ["NCCCO Crane Operator"],
      "phoneVerified": true,
      "availabilityStatus": true
    }
  }
}
```

---

## Shifts

### Create Shift

Create a new shift.

**Endpoint**: `POST /api/v1/shifts`

**Access**: Protected (SITE_MANAGER, PROJECT_MANAGER, COMPANY_ADMIN)

**Request Body**:
```json
{
  "startTime": "2026-02-01T08:00:00Z",
  "endTime": "2026-02-01T16:00:00Z",
  "workerId": "worker-uuid",
  "siteId": "site-uuid",
  "roleRequired": "crane_operator",
  "equipmentId": "crane-123",
  "operatorRate": 50.00,
  "siteRate": 150.00,
  "state": "assigned",
  "date": "2026-02-01"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "shift-uuid",
    "startTime": "2026-02-01T08:00:00Z",
    "endTime": "2026-02-01T16:00:00Z",
    "hours": 8.00,
    "workerId": "worker-uuid",
    "siteId": "site-uuid",
    "roleRequired": "crane_operator",
    "state": "assigned",
    "approved": false,
    "locked": false,
    "worker": { ... },
    "site": { ... }
  }
}
```

---

### Get All Shifts

Retrieve all shifts with optional filters.

**Endpoint**: `GET /api/v1/shifts`

**Access**: Protected

**Query Parameters**:
- `workerId` - Filter by worker ID
- `siteId` - Filter by site ID
- `state` - Filter by state (assigned, broadcasted, completed, etc.)
- `approved` - Filter by approval status (true/false)
- `date` - Filter by date (YYYY-MM-DD)

**Example**: `GET /api/v1/shifts?workerId=uuid&state=assigned`

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "shift-uuid",
      "date": "2026-02-01",
      "startTime": "2026-02-01T08:00:00Z",
      "endTime": "2026-02-01T16:00:00Z",
      "hours": 8.00,
      "roleRequired": "crane_operator",
      "state": "assigned",
      "approved": false,
      "worker": { ... },
      "site": { ... }
    }
  ]
}
```

---

### Get Shift by ID

Get details of a specific shift.

**Endpoint**: `GET /api/v1/shifts/:id`

**Access**: Protected (owner or manager)

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "shift-uuid",
    "date": "2026-02-01",
    "startTime": "2026-02-01T08:00:00Z",
    "endTime": "2026-02-01T16:00:00Z",
    "hours": 8.00,
    "totalHours": 7.50,
    "breakMinutes": 30,
    "roleRequired": "crane_operator",
    "state": "completed",
    "approved": true,
    "approvedAt": "2026-02-01T17:00:00Z",
    "locked": true,
    "worker": { ... },
    "site": { ... },
    "approvedBy": { ... },
    "applications": [ ... ]
  }
}
```

---

### Update Shift

Update shift details.

**Endpoint**: `PATCH /api/v1/shifts/:id`

**Access**: Protected (owner or manager, respects lock status)

**Request Body** (all fields optional):
```json
{
  "state": "completed",
  "actualStartTime": "2026-02-01T08:05:00Z",
  "actualEndTime": "2026-02-01T16:00:00Z",
  "breakMinutes": 30,
  "totalHours": 7.50,
  "overrideOperatorRate": 55.00
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "shift-uuid",
    "state": "completed",
    "actualStartTime": "2026-02-01T08:05:00Z",
    "actualEndTime": "2026-02-01T16:00:00Z",
    "totalHours": 7.50,
    "breakMinutes": 30,
    ...
  }
}
```

---

### Delete Shift

Delete a shift (managers only, restrictions apply).

**Endpoint**: `DELETE /api/v1/shifts/:id`

**Access**: Protected (PROJECT_MANAGER, COMPANY_ADMIN)

**Response**: `204 No Content`

---

### Approve Shift

Approve a completed shift.

**Endpoint**: `PATCH /api/v1/shifts/:id/approve`

**Access**: Protected (SITE_MANAGER, PROJECT_MANAGER, COMPANY_ADMIN)

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "shift-uuid",
    "approved": true,
    "approvedAt": "2026-02-01T17:00:00Z",
    "approvedById": "manager-uuid",
    "locked": true,
    ...
  }
}
```

---

### Broadcast Shift

Broadcast shift to available workers.

**Endpoint**: `PATCH /api/v1/shifts/:id/broadcast`

**Access**: Protected (SITE_MANAGER, PROJECT_MANAGER, COMPANY_ADMIN)

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "shift-uuid",
    "state": "broadcasted",
    ...
  }
}
```

---

## Applications

### Apply to Shift

Worker applies to a broadcasted shift.

**Endpoint**: `POST /api/v1/applications`

**Access**: Protected (OPERATOR)

**Request Body**:
```json
{
  "shiftId": "shift-uuid"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "application-uuid",
    "shiftId": "shift-uuid",
    "workerId": "worker-uuid",
    "status": "applied",
    "appliedAt": "2026-01-31T10:00:00Z",
    "worker": { ... },
    "shift": { ... }
  }
}
```

---

### Get Applications by Shift

Get all applications for a specific shift.

**Endpoint**: `GET /api/v1/applications/shift/:shiftId`

**Access**: Protected

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "application-uuid",
      "shiftId": "shift-uuid",
      "workerId": "worker-uuid",
      "status": "applied",
      "appliedAt": "2026-01-31T10:00:00Z",
      "worker": {
        "id": "worker-uuid",
        "name": "John Doe",
        "roles": ["crane_operator"],
        "certifications": ["NCCCO"]
      }
    }
  ]
}
```

---

### Get Applications by Worker

Get all applications submitted by a worker.

**Endpoint**: `GET /api/v1/applications/worker/:workerId`

**Access**: Protected

**Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "application-uuid",
      "shiftId": "shift-uuid",
      "workerId": "worker-uuid",
      "status": "applied",
      "appliedAt": "2026-01-31T10:00:00Z",
      "shift": {
        "id": "shift-uuid",
        "date": "2026-02-01",
        "roleRequired": "crane_operator",
        "site": { ... }
      }
    }
  ]
}
```

---

### Accept Application

Manager accepts a worker's application.

**Endpoint**: `PATCH /api/v1/applications/:id/accept`

**Access**: Protected (SITE_MANAGER, PROJECT_MANAGER, COMPANY_ADMIN)

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "application-uuid",
    "status": "accepted",
    "shift": { ... },
    "worker": { ... }
  }
}
```

---

### Reject Application

Manager rejects a worker's application.

**Endpoint**: `PATCH /api/v1/applications/:id/reject`

**Access**: Protected (SITE_MANAGER, PROJECT_MANAGER, COMPANY_ADMIN)

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "application-uuid",
    "status": "rejected",
    ...
  }
}
```

---

### Withdraw Application

Worker withdraws their own application.

**Endpoint**: `DELETE /api/v1/applications/:id`

**Access**: Protected (application owner)

**Response**: `204 No Content`

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limiting

_(To be implemented)_

## Versioning

Current version: **v1**

API versioning via URL path: `/api/v1/...`

## Support

For API support, contact: support@shiftmaster.com
