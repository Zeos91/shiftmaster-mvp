# ShiftMaster MVP - Auth Implementation Guide

## What's New

I've implemented a complete JWT-based authentication and role-based access control (RBAC) system for ShiftMaster. Here's what was added:

### 🔐 Core Components

1. **JWT Authentication Middleware** ([backend/src/middleware/auth.js](backend/src/middleware/auth.js))
   - `verifyToken` - Validates JWT tokens from request headers
   - `requireRole` - Checks user role and grants/denies access

2. **Auth Controller** ([backend/src/controllers/auth.controller.js](backend/src/controllers/auth.controller.js))
   - `register` - Create new users with password hashing
   - `login` - Authenticate users and issue JWT tokens
   - `getProfile` - Retrieve current user info (protected endpoint)

3. **Auth Routes** ([backend/src/routes/auth.routes.js](backend/src/routes/auth.routes.js))
   - `POST /api/auth/register` - Register new user
   - `POST /api/auth/login` - Login and get token
   - `GET /api/auth/profile` - Get current user (requires auth)

4. **Protected Shifts Endpoints**
   All shift operations now require valid JWT token:
   - `DELETE /api/shifts/:id` - Requires PROJECT_MANAGER or COMPANY_ADMIN
   - `PATCH /api/shifts/:id/approve` - Requires SITE_MANAGER, PROJECT_MANAGER, or COMPANY_ADMIN

### 📦 Dependencies Added

```json
{
  "jsonwebtoken": "^9.x",
  "bcryptjs": "^2.4.x",
  "dotenv": "^16.x"
}
```

### 🗄️ Database Changes

Added optional `password` field to User model:
```prisma
model User {
  id       String   @id @default(uuid())
  // ... other fields
  password String?  // hashed password for authentication
}
```

Migration: `20251219222047_add_password_to_user`

### 🔑 Configuration

Create a `.env` file in the backend directory:
```env
JWT_SECRET="your-super-secret-key-min-32-chars"
DATABASE_URL="postgresql://..."
PORT=3000
```

See [.env.example](.env.example) for template.

## User Roles

| Role | Permissions |
|------|-------------|
| OPERATOR | Create own shifts |
| SITE_MANAGER | Approve shifts for their site |
| PROJECT_MANAGER | Approve and delete shifts |
| COMPANY_ADMIN | Full access |

## Quick Start

### 1. Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Operator",
    "email": "john@example.com",
    "phone": "555-0123",
    "password": "securepass123",
    "role": "OPERATOR"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid-123",
    "name": "John Operator",
    "email": "john@example.com",
    "role": "OPERATOR"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Use Token on Protected Endpoints
```bash
curl -X GET http://localhost:3000/api/shifts \
  -H "Authorization: Bearer <your-token>"
```

### 3. Test All Endpoints
Run the test script to verify everything works:
```bash
# Start backend first
cd backend && npm run dev

# In another terminal
./test-auth.sh
```

## Security Features

✅ **Password Hashing** - bcrypt with 10 rounds  
✅ **JWT Tokens** - 7-day expiration  
✅ **Role-Based Access** - Granular endpoint protection  
✅ **No Plaintext Passwords** - Never returned in API responses  
✅ **Token Validation** - Signature verified on every request

## Architecture Decisions

1. **JWT over Sessions** - Stateless, scales across multiple servers
2. **Password Field Optional** - Allows migrations without breaking existing data
3. **Role-Based, not Permission-Based** - Simpler for MVP, can expand later
4. **Bcryptjs (not bcrypt)** - Pure JavaScript, no native compilation needed

## Next Steps

Enhance the implementation with:
- Email verification on registration
- Refresh token rotation
- Rate limiting on login attempts
- Password reset flow
- User management endpoints
- Audit logging

See [AUTH.md](AUTH.md) for complete documentation.

## Files Modified/Created

| File | Status |
|------|--------|
| [backend/src/middleware/auth.js](backend/src/middleware/auth.js) | ✨ Created |
| [backend/src/controllers/auth.controller.js](backend/src/controllers/auth.controller.js) | ✨ Created |
| [backend/src/routes/auth.routes.js](backend/src/routes/auth.routes.js) | ✨ Created |
| [backend/src/server.js](backend/src/server.js) | 📝 Updated (added auth routes, dotenv) |
| [backend/src/routes/shifts.routes.js](backend/src/routes/shifts.routes.js) | 📝 Updated (added auth middleware) |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) | 📝 Updated (added password field) |
| [backend/package.json](backend/package.json) | 📝 Updated (added dependencies) |
| [.env.example](.env.example) | ✨ Created |
| [AUTH.md](AUTH.md) | ✨ Created |
| [test-auth.sh](test-auth.sh) | ✨ Created |
| [.github/copilot-instructions.md](.github/copilot-instructions.md) | 📝 Updated |

---

**Commit:** d997bb5b - feat: Add JWT authentication and role-based access control
