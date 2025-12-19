# 🔐 ShiftMaster Authentication System - Documentation Index

## Quick Navigation

### 🚀 Getting Started
**Start here if you're new:**
- [QUICKSTART-AUTH.md](QUICKSTART-AUTH.md) — Commands & curl examples
- [IMPLEMENTATION-COMPLETE.md](IMPLEMENTATION-COMPLETE.md) — Full overview of what was built

### 📚 Complete Documentation
- [AUTH.md](AUTH.md) — Full authentication guide with setup, examples, and troubleshooting
- [AUTH-SYSTEM.md](AUTH-SYSTEM.md) — Architecture diagrams, API endpoints, workflow explanations
- [AUTH-IMPLEMENTATION.md](AUTH-IMPLEMENTATION.md) — Implementation details and next steps

### 👨‍💻 For Developers
- [.github/copilot-instructions.md](.github/copilot-instructions.md) — AI agent developer guide
- [backend/src/middleware/auth.js](backend/src/middleware/auth.js) — JWT & role-based middleware
- [backend/src/controllers/auth.controller.js](backend/src/controllers/auth.controller.js) — Auth logic
- [backend/src/routes/auth.routes.js](backend/src/routes/auth.routes.js) — API route definitions

### 🧪 Testing
- [test-auth.sh](test-auth.sh) — Automated test suite (run this first!)
- [.env.example](.env.example) — Configuration template

---

## What Was Implemented

### ✅ Core Features
- [x] JWT-based authentication
- [x] User registration with bcrypt password hashing
- [x] User login with token generation
- [x] Protected API endpoints
- [x] Role-based access control (RBAC)
- [x] User profile endpoint
- [x] 4 user roles: OPERATOR, SITE_MANAGER, PROJECT_MANAGER, COMPANY_ADMIN

### ✅ Security
- [x] Bcrypt password hashing (10 rounds)
- [x] JWT token signing & validation
- [x] 7-day token expiration
- [x] No plaintext passwords in responses
- [x] HTTP status codes (401, 403, 400)

### ✅ API Endpoints
- [x] POST /api/auth/register — Create user account
- [x] POST /api/auth/login — Login & get token
- [x] GET /api/auth/profile — Get user info (protected)
- [x] All /api/shifts/* endpoints protected with auth
- [x] Role-based protection on approve & delete endpoints

### ✅ Documentation & Testing
- [x] 5 comprehensive markdown guides
- [x] Automated test script
- [x] API examples & curl commands
- [x] Architecture diagrams
- [x] Troubleshooting guide
- [x] Environment configuration template

---

## File Structure

```
shiftmaster-mvp/
├── AUTH.md                          ← Complete auth guide
├── AUTH-SYSTEM.md                   ← Architecture & examples
├── AUTH-IMPLEMENTATION.md           ← Technical details
├── QUICKSTART-AUTH.md               ← Command reference
├── IMPLEMENTATION-COMPLETE.md       ← Full summary
├── AUTHENTICATION-INDEX.md          ← This file
├── .env.example                     ← Configuration template
├── test-auth.sh                     ← Test automation
├── .github/
│   └── copilot-instructions.md      ← AI developer guide
└── backend/
    ├── package.json                 ← Updated with auth deps
    ├── prisma/
    │   ├── schema.prisma            ← Added password field
    │   └── migrations/
    │       └── 20251219222047.../   ← Password migration
    └── src/
        ├── server.js                ← Added auth routes
        ├── middleware/
        │   └── auth.js              ← JWT & role middleware
        ├── controllers/
        │   └── auth.controller.js   ← Auth logic
        └── routes/
            ├── auth.routes.js       ← Auth endpoints
            └── shifts.routes.js     ← Protected shifts
```

---

## Quick Start (3 Steps)

### 1️⃣ Configure Environment
```bash
cp .env.example .env
# Edit .env and set JWT_SECRET and DATABASE_URL
```

### 2️⃣ Start Backend
```bash
cd backend && npm run dev
```

### 3️⃣ Run Tests
```bash
./test-auth.sh
```

---

## User Roles & Permissions

| Role | Can Create Shifts | Can Approve | Can Delete |
|------|------------------|-------------|-----------|
| OPERATOR | ✅ | ❌ | ❌ |
| SITE_MANAGER | ✅ | ✅ | ❌ |
| PROJECT_MANAGER | ✅ | ✅ | ✅ |
| COMPANY_ADMIN | ✅ | ✅ | ✅ |

---

## API Overview

### Authentication Endpoints
```
POST   /api/auth/register          Create new user account
POST   /api/auth/login             Authenticate & get JWT token
GET    /api/auth/profile           Get current user info (protected)
```

### Protected Shift Endpoints
```
GET    /api/shifts                 List all shifts (requires token)
POST   /api/shifts                 Create shift (requires token)
PATCH  /api/shifts/:id             Update shift (requires token)
PATCH  /api/shifts/:id/approve     Approve shift (SITE_MANAGER+)
DELETE /api/shifts/:id             Delete shift (PROJECT_MANAGER+)
```

---

## How to Use Tokens

### Get a Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}'
```

Response:
```json
{
  "user": {"id":"...", "name":"...", "role":"..."},
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Use Token on Protected Endpoint
```bash
curl -X GET http://localhost:3000/api/shifts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Documentation Map

```
QUICKSTART-AUTH.md
├─ For developers who want quick commands
├─ curl examples
└─ Bash aliases

AUTH.md
├─ Setup instructions
├─ API reference
├─ Examples
├─ Security features
└─ Troubleshooting

AUTH-SYSTEM.md
├─ Architecture diagram
├─ Workflow explanation
├─ Role matrix
├─ Development workflow
└─ Detailed examples

AUTH-IMPLEMENTATION.md
├─ What was built
├─ Implementation decisions
├─ Next steps
└─ Enhancement ideas

IMPLEMENTATION-COMPLETE.md
├─ Complete summary
├─ All components listed
├─ Testing checklist
└─ Key decisions explained

.github/copilot-instructions.md
├─ For AI agents
├─ Architecture overview
├─ Critical workflows
└─ Patterns & conventions
```

---

## Development Workflow

### Adding Auth to a New Endpoint

1. **Import middleware** in your routes file:
   ```javascript
   import { verifyToken, requireRole } from '../middleware/auth.js'
   ```

2. **Protect the route:**
   ```javascript
   router.patch('/:id/approve',
     verifyToken,
     requireRole('SITE_MANAGER', 'PROJECT_MANAGER'),
     approveHandler
   )
   ```

3. **Use user context** in controller:
   ```javascript
   export const approveHandler = async (req, res) => {
     const approvedBy = req.user.id    // Available from verifyToken
     const userRole = req.user.role    // Use for logging, etc.
     // ... handler logic
   }
   ```

---

## Common Tasks

### Create a New User Role
1. Add role to `Role` enum in [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
2. Create migration: `npm run prisma migrate dev --name add_new_role`
3. Use in routes: `requireRole('NEW_ROLE')`

### Add Permission to Endpoint
1. Update route with `requireRole(...roles)`
2. Add test case to [test-auth.sh](test-auth.sh)
3. Document in [AUTH.md](AUTH.md)

### Check User Role in Handler
```javascript
if (req.user.role === 'COMPANY_ADMIN') {
  // Admin-only logic
}
```

---

## Testing Checklist

- [ ] Backend starts: `npm run dev` works
- [ ] Migrations applied: `prisma migrate deploy` succeeds
- [ ] Test suite passes: `./test-auth.sh` completes
- [ ] Can register user
- [ ] Can login with credentials
- [ ] Can get profile with token
- [ ] Endpoints rejected without token (401)
- [ ] Role-based endpoints enforced (403)
- [ ] Passwords hashed correctly in database

---

## Next Steps

### Phase 1 (Immediate)
- [ ] Set up .env with JWT_SECRET
- [ ] Run test-auth.sh to verify setup
- [ ] Update mobile App.tsx to use tokens

### Phase 2 (Soon)
- [ ] Add email verification on registration
- [ ] Add password reset endpoint
- [ ] Add rate limiting on login

### Phase 3 (Future)
- [ ] Refresh token rotation
- [ ] User management UI
- [ ] Two-factor authentication

---

## Troubleshooting

### "Invalid token" Error
Check:
1. Token hasn't expired (7 days)
2. JWT_SECRET in .env matches
3. Authorization header format is correct: `Bearer <token>`

### "Forbidden" Error (403)
Check:
1. User role matches endpoint requirements
2. Role is correctly set in database
3. middleware is in correct order in routes

### "Missing required fields" Error (400)
Check:
1. Request body has all required fields
2. Field names match schema exactly

See [AUTH.md](AUTH.md) for more troubleshooting.

---

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [jsonwebtoken GitHub](https://github.com/auth0/node-jsonwebtoken)
- [Bcryptjs GitHub](https://github.com/dcodeIO/bcrypt.js)
- [Prisma ORM](https://www.prisma.io/)
- [JWT.io](https://jwt.io/) — Decode tokens

---

## Support

For questions, check:
1. [QUICKSTART-AUTH.md](QUICKSTART-AUTH.md) for quick answers
2. [AUTH.md](AUTH.md) for detailed explanations
3. [test-auth.sh](test-auth.sh) for working examples
4. [.github/copilot-instructions.md](.github/copilot-instructions.md) for architecture

---

**Status:** ✅ Complete & Ready for Testing  
**Last Updated:** December 19, 2025  
**Version:** 1.0.0
