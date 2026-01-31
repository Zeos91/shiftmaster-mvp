# Quick Start Guide - ShiftMaster Enterprise Architecture

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Start the Server
```bash
npm run dev:legacy
```
This runs the existing working server with **legacy routes** + **new v1 routes** working side-by-side!

### Step 3: Test the New API
```bash
# Health check
curl http://localhost:3000/api/v1/health

# Should return:
# {
#   "success": true,
#   "message": "API v1 is running",
#   "timestamp": "..."
# }
```

## 🎯 What's Available

### New v1 Endpoints (Ready to Use)

**Authentication**:
- `POST /api/v1/auth/register` - Register new worker
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/verify-otp` - Verify phone
- `GET /api/v1/auth/profile` - Get profile (protected)

**Shifts**:
- `POST /api/v1/shifts` - Create shift
- `GET /api/v1/shifts` - List shifts  
- `GET /api/v1/shifts/:id` - Get shift
- `PATCH /api/v1/shifts/:id` - Update shift
- `DELETE /api/v1/shifts/:id` - Delete shift
- `PATCH /api/v1/shifts/:id/approve` - Approve shift
- `PATCH /api/v1/shifts/:id/broadcast` - Broadcast shift

**Applications**:
- `POST /api/v1/applications` - Apply to shift
- `GET /api/v1/applications/shift/:shiftId` - Get applications for shift
- `GET /api/v1/applications/worker/:workerId` - Get worker's applications
- `PATCH /api/v1/applications/:id/accept` - Accept application
- `PATCH /api/v1/applications/:id/reject` - Reject application
- `DELETE /api/v1/applications/:id` - Withdraw application

### Legacy Endpoints (Still Working)
All existing endpoints at `/api/*` continue to work normally.

## 📖 Documentation

- **[Architecture Guide](docs/architecture.md)** - Full architecture documentation
- **[API Reference](docs/api.md)** - Complete API documentation
- **[Summary](RESTRUCTURING-SUMMARY.md)** - What was built
- **[Complete Report](RESTRUCTURING-COMPLETE.md)** - Detailed transformation report

## 🏗️ New File Structure

```
backend/src/
├── api/v1/              # New versioned API
│   ├── auth/
│   ├── shifts/
│   ├── applications/
│   └── index.ts
│
├── domain/              # Business logic layer
│   ├── auth/
│   ├── shift/
│   ├── worker/
│   ├── application/
│   └── shared/
│
├── infra/               # Infrastructure layer
│   ├── db/
│   ├── auth/
│   ├── logger/
│   └── config/
│
├── middlewares/
├── utils/
├── app.ts              # Express setup
└── server.ts           # Entry point
```

## 🎨 For Frontend Developers

### Use New v1 API
```typescript
// Example: Login
const response = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'user@example.com', 
    password: 'password123' 
  })
})

const { success, data, error } = await response.json()

if (success) {
  const { token, worker } = data
  localStorage.setItem('token', token)
}
```

### Standardized Response Format
```typescript
// Success
{
  success: true,
  data: { ... },
  meta: { timestamp: "..." }
}

// Error
{
  success: false,
  error: {
    message: "...",
    field: "...",
    code: "..."
  },
  meta: { timestamp: "..." }
}
```

## 🔐 Authentication

All protected endpoints require JWT token:
```typescript
fetch('http://localhost:3000/api/v1/shifts', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

## 💻 For Backend Developers

### Adding a New Feature

1. **Create Service** (`domain/feature/FeatureService.ts`):
```typescript
export class FeatureService {
  async doSomething(input, user, context) {
    // Business logic here
    featurePolicy.enforcePermission(user)
    const result = await featureRepository.create(input)
    await this.audit(context)
    return result
  }
}
```

2. **Create Repository** (`domain/feature/FeatureRepository.ts`):
```typescript
export class FeatureRepository {
  async create(data) {
    return prisma.feature.create({ data })
  }
}
```

3. **Create Policy** (`domain/feature/FeaturePolicy.ts`):
```typescript
export class FeaturePolicy {
  enforcePermission(user) {
    if (![Role.ADMIN].includes(user.role)) {
      throw new ForbiddenError('...')
    }
  }
}
```

4. **Create Controller** (`api/v1/feature/feature.controller.ts`):
```typescript
export const createFeature = async (req, res) => {
  try {
    const result = await featureService.doSomething(...)
    return createdResponse(res, result)
  } catch (error) {
    return handleError(error, res)
  }
}
```

5. **Create Routes** (`api/v1/feature/feature.routes.ts`):
```typescript
router.post('/', verifyToken, createFeature)
```

## 🧪 Testing

### Test New Endpoints
```bash
# Install a REST client like httpie or use curl

# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## ⚡ Performance

The new architecture is optimized for:
- Minimal middleware overhead
- Efficient database queries via repositories
- Singleton patterns for shared resources
- Ready for caching layers

## 🔧 Troubleshooting

### Server won't start?
```bash
# Check if dependencies installed
cd backend && npm install

# Try legacy server
npm run dev:legacy

# Check port is free
lsof -i :3000
```

### TypeScript errors?
TypeScript is optional. The legacy JavaScript server works perfectly:
```bash
npm run dev:legacy
```

### Need help?
- Check `docs/architecture.md` for patterns
- Check `docs/api.md` for endpoints
- Review example services in `domain/`

## ✅ What Works Right Now

- ✅ All legacy endpoints (`/api/*`)
- ✅ New v1 endpoints (`/api/v1/*`)
- ✅ Authentication & JWT
- ✅ RBAC (Role-based access)
- ✅ Database operations
- ✅ Audit logging
- ✅ Notifications
- ✅ All existing features

## 🎯 Ready for Production

The architecture is production-ready:
- Clean separation of concerns
- Business logic isolated
- Authorization centralized
- Database abstracted
- Responses standardized
- Error handling consistent

## 🚀 Deploy to Production

```bash
# Build TypeScript (optional)
npm run build

# Start production server
npm start

# Or use the legacy server
node src/server.js
```

---

**You're all set! Start building features with enterprise-grade architecture! 🎉**
