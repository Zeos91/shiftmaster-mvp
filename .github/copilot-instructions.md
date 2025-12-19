# ShiftMaster MVP - AI Coding Agent Instructions

## Project Overview
ShiftMaster is a shift management and billing system for crane operators. It's a full-stack MVP with a Node.js/Express backend (PostgreSQL + Prisma) and a React Native mobile frontend (Expo).

**Key Goal:** Track crane operator shifts, manage approval workflows, calculate operator costs & site revenues with dynamic rate overrides, and enforce role-based access control.

## Architecture & Data Flow

### Backend Stack
- **Framework:** Express.js (ES modules), port 3000
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with bcrypt password hashing
- **Key Entry:** [backend/src/server.js](backend/src/server.js) — sets up CORS (*), JSON middleware, routes
- **Routes:** `/api/auth` (login/register), `/api/shifts` (shift management)

### Authentication System
ShiftMaster uses JWT-based stateless authentication with role-based access control:
- **Auth Middleware:** [backend/src/middleware/auth.js](backend/src/middleware/auth.js) — `verifyToken()` and `requireRole(...roles)` 
- **Auth Controller:** [backend/src/controllers/auth.controller.js](backend/src/controllers/auth.controller.js) — register, login, profile endpoints
- **Auth Routes:** [backend/src/routes/auth.routes.js](backend/src/routes/auth.routes.js)
- **Token Format:** JWT expires in 7 days, contains `{id, email, role}`
- **User Roles:** OPERATOR, SITE_MANAGER, PROJECT_MANAGER, COMPANY_ADMIN (see [AUTH.md](AUTH.md) for details)

### Core Data Model (Prisma Schema)
The database centers on **Shifts** with financial tracking:
- **User:** 4 roles (OPERATOR, SITE_MANAGER, PROJECT_MANAGER, COMPANY_ADMIN). Includes `password` (hashed). Can operate shifts, approve shifts, manage sites
- **Shift:** Core entity linking operator → site → crane. Includes `hours`, `startTime/endTime`, dual rates (operator cost, site revenue), optional overrides for emergencies, and approval workflow (`approved`, `approvedById`)
- **Site:** Managed by a site manager, contains cranes
- **Crane:** Belongs to site
- **OperatorRate/SiteRate:** Time-series rate tables (`validFrom/validTo`) supporting rate changes

**Key Pattern:** Shifts store both default rates AND optional overrides in `overrideOperatorRate` / `overrideSiteRate` (nullable decimals). This allows handling emergency cases without retroactive rate changes.

### Frontend (React Native/Expo)
- **Entry:** [mobile/App.tsx](mobile/App.tsx) — fetches shifts, posts new shifts
- **API Client:** Uses `axios` to `https://upgraded-space-telegram-9j6wvxxxp42xvpj-3000.app.github.dev/` (Codespaces preview URL)
- **State:** Simple `useState` for shifts array

## Critical Developer Workflows

### Start Backend (Dev Mode)
```bash
cd backend
npm run dev
```
Uses `nodemon` to watch/reload on changes. Runs on `$PORT` (default 3000).

### Database Migrations
```bash
cd backend
npm run prisma migrate dev --name <migration_name>
```
Migrations live in [backend/prisma/migrations/](backend/prisma/migrations/) with numbered timestamps.

### Start Mobile
```bash
cd mobile
npm start
```
Expo dev server. Updates `API_URL` in [mobile/App.tsx](mobile/App.tsx) when testing against different backends.

## Patterns & Conventions

### API Endpoint Structure
Routes follow REST conventions with PATCH for partial updates/state changes:
- `POST /api/auth/register` — register user with hashed password
- `POST /api/auth/login` — authenticate and return JWT token
- `GET /api/auth/profile` — get current user (requires auth)
- `POST /api/shifts` — create shift (calculates `hours` if missing, requires auth)
- `GET /api/shifts` — list all shifts (requires auth)
- `PATCH /api/shifts/:id` — partial update (requires auth)
- `PATCH /api/shifts/:id/approve` — approve shift (SITE_MANAGER/PROJECT_MANAGER/COMPANY_ADMIN only)
- `DELETE /api/shifts/:id` — delete shift (PROJECT_MANAGER/COMPANY_ADMIN only)

### Controller Pattern
Each endpoint in [backend/src/controllers/shifts.controller.js](backend/src/controllers/shifts.controller.js) follows:
1. Try-catch wrapping
2. Destructure request body
3. Validate required fields (e.g., `operatorId`, `siteId`, `craneId` for shifts)
4. Use Prisma with `include: { operator, site, crane }` to return full related data
5. Return 201/200 on success, 400/500 on error

**Special Logic:** `createShift` calculates hours from timestamps if not provided: `(end - start) / (1000 * 60 * 60)`

### Rate Override Handling
Shifts allow nullable `overrideOperatorRate` and `overrideSiteRate`. These are only set if special circumstances require deviating from default rates. Always include both in response payloads.

## Key Files & Responsibilities

| File | Purpose |
|------|---------|
| [backend/src/server.js](backend/src/server.js) | Express app setup, CORS, middleware |
| [backend/prisma/schema.prisma](backend/prisma/schema.prisma) | Data model with all relations & rate tracking |
| [backend/src/routes/shifts.routes.js](backend/src/routes/shifts.routes.js) | Route definitions for shifts endpoints |
| [backend/src/controllers/shifts.controller.js](backend/src/controllers/shifts.controller.js) | Business logic for all shift operations |
| [backend/src/prisma.js](backend/src/prisma.js) | Prisma client singleton |
| [backend/src/middleware/auth.js](backend/src/middleware/auth.js) | JWT verification and role-based access control |
| [backend/src/controllers/auth.controller.js](backend/src/controllers/auth.controller.js) | User registration, login, profile endpoints |
| [backend/src/routes/auth.routes.js](backend/src/routes/auth.routes.js) | Authentication routes |
| [mobile/App.tsx](mobile/App.tsx) | React Native root component, shift list & create |
| [AUTH.md](AUTH.md) | Comprehensive auth & RBAC documentation |

## Integration Points

- **Approval Workflow:** Only users with `approvedById` can mark shifts approved. Frontend should fetch user context and enforce role-based visibility. `requireRole()` middleware ensures only SITE_MANAGER, PROJECT_MANAGER, or COMPANY_ADMIN can call approve endpoint.
- **Rate Lookups:** Currently hardcoded in requests; future feature: query `OperatorRate`/`SiteRate` tables by date to auto-populate defaults before shift creation.
- **Timestamps:** Always use ISO 8601 for `startTime`/`endTime`. Backend parses with `new Date()`.
- **Authentication:** All shift endpoints require JWT token in `Authorization: Bearer <token>` header. Use `/api/auth/login` to obtain token.
- **Role-Based Access:** Apply `requireRole()` to endpoints requiring specific permissions. Use multiple roles: `requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN')`

## Common Tasks

### Adding a new shift field
1. Add to Prisma schema in [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
2. Create migration: `npm run prisma migrate dev --name add_field_name`
3. Update controller in [backend/src/controllers/shifts.controller.js](backend/src/controllers/shifts.controller.js) to handle in CRUD operations
4. Update frontend [mobile/App.tsx](mobile/App.tsx) to display/submit if user-facing

### Adding a new endpoint
1. Define route in [backend/src/routes/shifts.routes.js](backend/src/routes/shifts.routes.js)
2. Implement handler in [backend/src/controllers/shifts.controller.js](backend/src/controllers/shifts.controller.js)
3. Include full entity relations (`include: { operator, site, crane }`) in responses
4. Test via mobile app or curl

### Testing shifts API locally
```bash
curl -X POST http://localhost:3000/api/shifts \
  -H "Content-Type: application/json" \
  -d '{
    "operatorId": "op-uuid",
    "siteId": "site-uuid",
    "craneId": "crane-uuid",
    "startTime": "2025-01-01T08:00:00Z",
    "endTime": "2025-01-01T16:00:00Z",
    "operatorRate": 50.00,
    "siteRate": 150.00
  }'
```

## Notes for AI Agents

- **Auth middleware is in place:** [backend/src/middleware/auth.js](backend/src/middleware/auth.js) provides `verifyToken()` and `requireRole()`. Use them on new endpoints.
- **Password hashing:** Passwords hashed with bcrypt (10 rounds) in `register` and `login` endpoints. Never store plaintext passwords.
- **JWT configuration:** Set `JWT_SECRET` in `.env`. Token expires in 7 days. See [.env.example](.env.example).
- **CORS is wide open:** `origin: '*'` — fine for MVP, tighten before production.
- **Error handling is basic:** Logs to console, returns 500 with message. Consider structured logging for debugging.
- **No validation library:** Manual field checks in controllers. Consider `joi` or `zod` if field count grows.
- **Mobile API URL is hardcoded:** Update [mobile/App.tsx](mobile/App.tsx) `API_URL` when deploying to different backends. Add token handling for auth.
- **Seeding:** Use [backend/prisma/seed.ts](backend/prisma/seed.ts) to populate test data with hashed passwords.
