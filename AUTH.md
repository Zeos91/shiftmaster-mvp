# Authentication & Authorization Guide

## Overview
ShiftMaster uses JWT (JSON Web Tokens) for stateless authentication and role-based access control (RBAC) to protect API endpoints.

## Setup

### 1. Environment Variables
Add to `.env`:
```
JWT_SECRET="your-secure-secret-key-min-32-chars"
```

### 2. Key Components

#### Auth Middleware ([backend/src/middleware/auth.js](backend/src/middleware/auth.js))
- `verifyToken`: Validates JWT token from `Authorization: Bearer <token>` header
- `requireRole(...roles)`: Checks if user has required role(s)

#### Auth Controller ([backend/src/controllers/auth.controller.js](backend/src/controllers/auth.controller.js))
- `register`: Create new user with hashed password
- `login`: Authenticate and return JWT token
- `getProfile`: Fetch current user details (requires auth)

#### Auth Routes ([backend/src/routes/auth.routes.js](backend/src/routes/auth.routes.js))
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/profile` - Get current user (protected)

## User Roles

```
OPERATOR        - Can create shifts (their own)
SITE_MANAGER    - Can approve shifts for their site
PROJECT_MANAGER - Can approve/delete shifts
COMPANY_ADMIN   - Full access
```

## API Examples

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234",
    "password": "securepassword123",
    "role": "OPERATOR"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "OPERATOR"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

### Using Token
Add `Authorization` header to protected endpoints:
```bash
curl -X GET http://localhost:3000/api/shifts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Endpoint Protection

### Authentication Required
All shift endpoints now require valid JWT token:
- `GET /api/shifts` - Fetch all shifts
- `POST /api/shifts` - Create shift
- `PATCH /api/shifts/:id` - Update shift
- `DELETE /api/shifts/:id` - Delete shift (PROJECT_MANAGER, COMPANY_ADMIN only)
- `PATCH /api/shifts/:id/approve` - Approve shift (SITE_MANAGER, PROJECT_MANAGER, COMPANY_ADMIN only)

## How JWT Works

1. **User logs in** → Backend validates credentials and signs JWT with secret
2. **Client stores token** → Typically in localStorage/sessionStorage
3. **Client sends token** → Includes in `Authorization: Bearer <token>` header
4. **Backend verifies token** → Uses secret key to validate signature
5. **Request proceeds** → If valid, `req.user` contains decoded claims (id, email, role)

Token expires in 7 days. After expiration, user must login again.

## Adding Role-Based Checks

To protect an endpoint with role checks:

```javascript
import { verifyToken, requireRole } from '../middleware/auth.js'

// Only PROJECT_MANAGER and COMPANY_ADMIN can delete
router.delete('/:id', 
  verifyToken, 
  requireRole('PROJECT_MANAGER', 'COMPANY_ADMIN'), 
  deleteHandler
)
```

## Password Security

- Passwords hashed with bcrypt (10 rounds)
- Never stored in JWT token
- Passwords never returned in API responses
- Always sent over HTTPS in production

## Future Enhancements

- [ ] Refresh token rotation
- [ ] Rate limiting on login attempts
- [ ] Email verification on registration
- [ ] Password reset flow
- [ ] User management endpoints (update profile, change password)
- [ ] Audit logging of approvals/deletions
