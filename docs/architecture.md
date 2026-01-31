# ShiftMaster - Enterprise Architecture Documentation

## Overview

ShiftMaster has been restructured into an enterprise-grade monorepo following clean architecture principles. This document describes the new architecture, patterns, and conventions.

## Architecture Principles

### 1. **Separation of Concerns**
- **Domain Layer**: Business logic, policies, and repositories
- **API Layer**: HTTP request/response handling (thin controllers)
- **Infrastructure Layer**: Database, authentication, logging, configuration

### 2. **Dependency Rule**
Dependencies point inward:
```
API Layer → Domain Layer → Infrastructure Layer
```

### 3. **Business Logic Isolation**
All business rules live in domain services and policies, NOT in controllers.

### 4. **Repository Pattern**
All database access goes through repository classes. Controllers never touch Prisma directly.

### 5. **Policy-Based Authorization**
Authorization rules are centralized in policy classes, separate from business logic.

## Directory Structure

```
backend/
├── src/
│   ├── api/                     # API Layer (Controllers & Routes)
│   │   └── v1/
│   │       ├── auth/
│   │       │   ├── auth.controller.ts
│   │       │   └── auth.routes.ts
│   │       ├── shifts/
│   │       │   ├── shifts.controller.ts
│   │       │   └── shifts.routes.ts
│   │       ├── applications/
│   │       │   ├── applications.controller.ts
│   │       │   └── applications.routes.ts
│   │       └── index.ts
│   │
│   ├── domain/                  # Domain Layer (Business Logic)
│   │   ├── auth/
│   │   │   ├── AuthService.ts       # Authentication business logic
│   │   │   └── AuthPolicy.ts        # Authorization rules
│   │   ├── shift/
│   │   │   ├── ShiftService.ts      # Shift business logic
│   │   │   ├── ShiftPolicy.ts       # Shift authorization rules
│   │   │   └── ShiftRepository.ts   # Shift database access
│   │   ├── worker/
│   │   │   ├── WorkerService.ts     # Worker business logic
│   │   │   └── WorkerRepository.ts  # Worker database access
│   │   ├── application/
│   │   │   ├── ApplicationService.ts
│   │   │   ├── ApplicationPolicy.ts
│   │   │   └── ApplicationRepository.ts
│   │   └── shared/
│   │       ├── enums.ts             # Domain enumerations
│   │       └── errors.ts            # Domain-level errors
│   │
│   ├── infra/                   # Infrastructure Layer
│   │   ├── db/
│   │   │   └── prisma.ts            # Prisma client singleton
│   │   ├── auth/
│   │   │   ├── jwt.ts               # JWT token handling
│   │   │   └── password.ts          # Password hashing
│   │   ├── logger/
│   │   │   └── logger.ts            # Centralized logging
│   │   └── config/
│   │       └── env.ts               # Environment configuration
│   │
│   ├── middlewares/
│   │   └── auth.middleware.ts       # JWT & RBAC middleware
│   │
│   ├── utils/
│   │   └── response.ts              # Standardized API responses
│   │
│   ├── app.ts                   # Express app setup
│   └── server.ts                # Server entry point
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
├── tsconfig.json
├── package.json
└── nodemon.json
```

## Layer Responsibilities

### API Layer (`src/api/v1/`)

**Responsibility**: HTTP request/response handling only

**Controllers**:
- Parse request data
- Call domain services
- Format responses using standardized utilities
- Handle errors and map them to HTTP status codes
- NO business logic

**Example**:
```typescript
export const createShift = async (req: Request, res: Response): Promise<Response> => {
  try {
    const shift = await shiftService.createShift(req.body, req.user, auditContext)
    return createdResponse(res, shift)
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(res, error.message)
    }
    // ... error handling
  }
}
```

### Domain Layer (`src/domain/`)

**Responsibility**: All business logic and rules

**Services**:
- Implement business operations
- Coordinate between repositories
- Enforce business rules
- Emit events
- Create audit logs
- NO HTTP concerns

**Policies**:
- Define authorization rules
- Enforce permissions
- Check business constraints
- NO database access

**Repositories**:
- Abstract database operations
- Provide clean interfaces for data access
- Handle Prisma queries
- NO business logic

**Example**:
```typescript
export class ShiftService {
  async createShift(input: CreateShiftInput, currentUser: Worker, context: AuditContext) {
    // Validate input
    this.validateCreateInput(input)
    
    // Check authorization
    shiftPolicy.enforceCreate(currentUser)
    
    // Business logic
    const hours = this.calculateHours(startTime, endTime)
    
    // Data access
    const shift = await shiftRepository.create(data)
    
    // Audit & events
    await logAudit(...)
    emitDashboardEvent(...)
    
    return shift
  }
}
```

### Infrastructure Layer (`src/infra/`)

**Responsibility**: External dependencies and utilities

- Database client (Prisma)
- JWT token generation/verification
- Password hashing
- Logging
- Environment configuration

## Key Patterns

### 1. Repository Pattern

All database access goes through repository classes:

```typescript
// ❌ DON'T: Access Prisma directly in controllers
const shift = await prisma.shift.findUnique({ where: { id } })

// ✅ DO: Use repository
const shift = await shiftRepository.findById(id)
```

### 2. Service Pattern

Business logic lives in domain services:

```typescript
// ❌ DON'T: Business logic in controller
export const createShift = async (req, res) => {
  const hours = (endTime - startTime) / (1000 * 60 * 60)
  if (!validateRole(worker, role)) throw new Error('...')
  // ... more business logic
}

// ✅ DO: Business logic in service
export class ShiftService {
  async createShift(input, user, context) {
    this.validateInput(input)
    shiftPolicy.enforceCreate(user)
    // ... business logic
  }
}
```

### 3. Policy Pattern

Authorization rules in policy classes:

```typescript
// ❌ DON'T: Authorization in controller
if (!['SITE_MANAGER', 'ADMIN'].includes(user.role)) {
  return res.status(403).json({ error: 'Forbidden' })
}

// ✅ DO: Authorization in policy
shiftPolicy.enforceApprove(user) // throws ForbiddenError
```

### 4. Standardized Responses

Use response utilities for consistency:

```typescript
// ❌ DON'T: Manual response formatting
return res.status(201).json({ shift })

// ✅ DO: Use response utilities
return createdResponse(res, shift)
```

## API Versioning

### Current Structure

- **v1**: `/api/v1/*` - New enterprise architecture
- **Legacy**: `/api/*` - Old routes (for backward compatibility)

### Migration Strategy

1. New features go in `/api/v1`
2. Legacy routes remain functional
3. Gradually migrate clients to v1
4. Deprecate legacy routes in future release

### API Response Format

All v1 endpoints return standardized format:

**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-01-31T12:00:00.000Z"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "field": "email",
    "code": "VALIDATION_ERROR"
  },
  "meta": {
    "timestamp": "2026-01-31T12:00:00.000Z"
  }
}
```

## Authentication & Authorization

### JWT Authentication

1. User logs in → receives JWT token
2. Token contains: `{ id, email, role }`
3. Token passed in `Authorization: Bearer <token>` header
4. Middleware verifies token and attaches `req.user`

### Role-Based Access Control (RBAC)

**Roles** (from lowest to highest privilege):
- `OPERATOR` - Shift workers
- `SITE_MANAGER` - Manages sites
- `PROJECT_MANAGER` - Manages projects
- `COMPANY_ADMIN` - Full access

**Enforcement**:
```typescript
// In routes:
router.patch(
  '/:id/approve',
  verifyToken,
  requireRole('SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN'),
  approveShift
)

// In services:
shiftPolicy.enforceApprove(user) // throws ForbiddenError if not allowed
```

## Error Handling

### Domain Errors

All domain errors extend `DomainError`:

- `ValidationError` → 400 Bad Request
- `UnauthorizedError` → 401 Unauthorized
- `ForbiddenError` → 403 Forbidden
- `NotFoundError` → 404 Not Found
- `ConflictError` → 409 Conflict
- `BusinessRuleViolationError` → 400 Bad Request

### Error Flow

1. Service throws domain error
2. Controller catches error
3. Controller maps to HTTP response using response utilities

```typescript
try {
  const result = await service.doSomething(...)
  return successResponse(res, result)
} catch (error) {
  if (error instanceof ValidationError) {
    return validationErrorResponse(res, error.message, error.field)
  }
  if (error instanceof NotFoundError) {
    return notFoundResponse(res, 'Resource')
  }
  // ... handle other errors
  return errorResponse(res, 'Internal server error')
}
```

## TypeScript Migration

The project supports gradual TypeScript migration:

- **New code**: Written in TypeScript (`.ts`)
- **Legacy code**: Remains in JavaScript (`.js`)
- **Interop**: ES modules allow seamless imports

### Running in Development

```bash
npm run dev          # Runs new TypeScript server
npm run dev:legacy   # Runs old JavaScript server
```

### Building for Production

```bash
npm run build        # Compiles TypeScript to dist/
npm start            # Runs compiled JavaScript
```

## Testing Strategy

### Unit Tests
- Test domain services in isolation
- Mock repositories
- Verify business logic

### Integration Tests
- Test API endpoints
- Use test database
- Verify full request/response cycle

## Next Steps

### Recommended Improvements

1. **OpenAPI Documentation**: Generate from controllers
2. **Validation Library**: Add Zod or Joi for input validation
3. **Advanced Logging**: Integrate Winston or Pino
4. **Rate Limiting**: Protect endpoints from abuse
5. **Caching**: Add Redis for performance
6. **Monitoring**: Add APM (Application Performance Monitoring)

### Migration Checklist

- [ ] Install TypeScript dependencies: `npm install`
- [ ] Run database migrations: `npm run prisma migrate deploy`
- [ ] Test new v1 endpoints
- [ ] Update frontend to use v1 API
- [ ] Deprecate legacy endpoints
- [ ] Remove old controller/route files

## Support

For questions or issues with the new architecture, refer to:
- `docs/api.md` - API endpoint documentation
- `docs/auth.md` - Authentication & authorization details
- `docs/rbac.md` - Role-based access control guide
