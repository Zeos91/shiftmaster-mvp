# ShiftMaster MVP

Full-stack shift management and billing system for crane operators with real-time updates, customizable dashboards, and role-based access control.

## Tech Stack

### Backend
- **Runtime:** Node.js with Express.js (ES modules)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with bcrypt password hashing
- **Real-time:** Server-Sent Events (SSE) with automatic fallback to polling
- **Port:** 3000

### Frontend
- **Framework:** Next.js 15 with TypeScript
- **State Management:** React Query + Zustand
- **UI Components:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Real-time:** Custom SSE hook with automatic reconnection
- **Widgets:** react-grid-layout for drag/drop customization
- **Notifications:** react-toastify with priority-based styling

## Key Features

### Phase 12: Real-Time Dashboard Streaming ✅
- Server-Sent Events (SSE) for live dashboard updates
- Automatic fallback to polling when SSE unavailable
- Connection status indicators with visual feedback
- Comprehensive test coverage (40 frontend + 13 backend tests)
- Performance optimized with React.memo and lazy loading

### Phase 13: Advanced Dashboard Features & Analytics ✅
- **Customizable Widget System**
  - Drag-and-drop widget repositioning
  - Resizable widgets with min/max constraints
  - 7 widget types: summary cards, shift trends, worker activity, activity feed, recent shifts, broadcast metrics, performance monitor
  - Layout persistence in localStorage via Zustand
  
- **Historical Analytics**
  - Time-series trend data for shifts, workers, and applications
  - Aggregated metrics with date range filtering
  - Site-specific and role-specific analytics
  - Paginated activity history with audit logs

- **Priority-Based Notifications**
  - Real-time toast notifications (info, warning, critical)
  - Event filtering by priority level
  - Critical alerts require manual dismissal
  - Connection status notifications

- **Performance Optimization**
  - React.memo for widget components
  - Dynamic imports for charts with loading states
  - SSE event batching
  - Connection/heartbeat metrics tracking

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register new worker (requires phone verification)
- `POST /api/auth/login` — Authenticate and get JWT token
- `GET /api/auth/profile` — Get current user profile

### Shifts
- `POST /api/shifts` — Create shift (calculates hours from timestamps)
- `GET /api/shifts` — List all shifts with full relations
- `PATCH /api/shifts/:id` — Partial update
- `PATCH /api/shifts/:id/approve` — Approve shift (SITE_MANAGER+)
- `DELETE /api/shifts/:id` — Delete shift (PROJECT_MANAGER+)

### Dashboard & Analytics
- `GET /api/dashboard/stream` — SSE endpoint for real-time updates
- `GET /api/dashboard/analytics` — Aggregated metrics with filters
- `GET /api/dashboard/history` — Paginated activity logs
- `GET /api/dashboard/trends` — Time-series data (shifts, workers, applications)

## Data Model

### Core Entities
- **Worker:** Users with roles (OPERATOR, SITE_MANAGER, PROJECT_MANAGER, COMPANY_ADMIN)
- **Shift:** Core entity with dual rates (operator cost, site revenue), optional overrides for emergencies
- **Site:** Managed by site manager, contains cranes
- **Crane:** Belongs to site
- **OperatorRate/SiteRate:** Time-series rate tables with validFrom/validTo

### Key Patterns
- Shifts store both default rates AND optional overrides (`overrideOperatorRate`, `overrideSiteRate`)
- Approval workflow requires `approvedById` tracking
- Rate lookups by date using time-series tables

## Development

### Setup

```bash
# Backend
cd backend
npm install
npm run prisma migrate dev
npm run prisma generate
npm run dev

# Frontend
cd web
npm install
npm run dev
```

### Environment Variables

Backend (`.env`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/shiftmaster"
JWT_SECRET="your-secret-key"
ALLOWED_ORIGINS="http://localhost:3001,http://localhost:3000"
PORT=3000
```

Frontend (`.env.local`):
```env
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### Database Migrations

```bash
cd backend
npm run prisma migrate dev --name <migration_name>
```

Migrations stored in `backend/prisma/migrations/` with timestamps.

### Testing

```bash
# Backend tests (13 SSE tests)
cd backend
npm test

# Frontend tests (40 component/hook tests)
cd web
npm test
```

## Architecture

### Authentication System
- JWT-based stateless authentication
- Middleware: `verifyToken()` and `requireRole(...roles)` in `backend/src/middleware/auth.js`
- Token format: `{id, email, role}`, expires in 7 days
- Password hashing: bcrypt with 10 rounds

### Real-Time Updates
- SSE primary, polling fallback
- DashboardStreamService tracks connections, heartbeats, event processing times
- Priority-based event broadcasting (info, warning, critical)
- Automatic reconnection with exponential backoff

### Frontend State Management
- React Query for server state with optimistic updates
- Zustand for widget layouts with localStorage persistence
- Context API for authentication state

## Project Structure

```
backend/
├── src/
│   ├── server.js              # Express setup, CORS, routes
│   ├── prisma.js              # Prisma client singleton
│   ├── controllers/           # Business logic
│   │   ├── auth.controller.js
│   │   ├── shifts.controller.js
│   │   └── analytics.controller.js
│   ├── routes/                # Route definitions
│   ├── middleware/            # JWT verification, RBAC
│   └── services/              # DashboardStreamService
├── prisma/
│   └── schema.prisma          # Data model
└── tests/                     # Backend tests

web/
├── src/
│   ├── app/                   # Next.js pages
│   ├── components/            # React components
│   │   └── dashboard/         # Widget components
│   ├── hooks/                 # Custom hooks (useDashboardStream)
│   ├── store/                 # Zustand stores
│   ├── lib/                   # Axios client
│   └── context/               # React contexts
└── __tests__/                 # Frontend tests
```

## Contributing

See individual documentation files:
- `AUTH.md` - Authentication & RBAC guide
- `AUTHENTICATION-INDEX.md` - Auth implementation overview
- `TESTING-AUTH-API.md` - API testing guide

## License

Proprietary - All rights reserved
