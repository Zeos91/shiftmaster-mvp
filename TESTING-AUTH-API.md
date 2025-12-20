# ShiftMaster Authentication & Shifts API Testing Guide

Complete guide to testing the authentication flow and shift management API in Codespaces.

## Prerequisites

1. **Environment Setup**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Configure .env** (for development without real Twilio)
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/shiftmaster"
   JWT_SECRET="dev-secret-key-123"
   TWILIO_ACCOUNT_SID="dummy_sid"  # Won't actually send SMS in dev
   TWILIO_AUTH_TOKEN="dummy_token"
   TWILIO_PHONE_NUMBER="+1234567890"
   NODE_ENV="development"
   PORT=3000
   ```

3. **Start Backend**
   ```bash
   npm run dev
   ```
   Server runs on http://localhost:3000

4. **Seed Database with Test Data**
   ```bash
   npm run prisma db seed
   ```

## Testing Authentication Flow

### Test 1: Register New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Developer",
    "email": "alice@example.com",
    "phone": "+1234567890",
    "password": "SecurePass123!",
    "role": "OPERATOR"
  }'
```

**Expected Response (201 Created):**
```json
{
  "message": "User registered successfully. Please verify your phone with the OTP sent via SMS.",
  "user": {
    "id": "uuid-here",
    "name": "Alice Developer",
    "email": "alice@example.com",
    "phone": "+1234567890",
    "role": "OPERATOR"
  }
}
```

> **Note:** In development mode, the OTP will be logged to the server console (check `npm run dev` output)

### Test 2: Verify OTP

**Check the backend console for the OTP code from step 1**, then:

```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "code": "123456"  # Replace with actual OTP from console
  }'
```

**Expected Response (200 OK):**
```json
{
  "message": "Phone verified successfully",
  "user": {
    "id": "uuid-here",
    "name": "Alice Developer",
    "email": "alice@example.com",
    "phone": "+1234567890",
    "role": "OPERATOR"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save the token for subsequent requests!**

### Test 3: Login User

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected Response (200 OK):**
```json
{
  "user": {
    "id": "uuid-here",
    "name": "Alice Developer",
    "email": "alice@example.com",
    "phone": "+1234567890",
    "role": "OPERATOR"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Test 4: Get User Profile (Requires Auth)

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # From login response

curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "id": "uuid-here",
  "name": "Alice Developer",
  "email": "alice@example.com",
  "phone": "+1234567890",
  "role": "OPERATOR",
  "phoneVerified": true,
  "residenceLocation": null,
  "createdAt": "2025-12-19T..."
}
```

### Test 5: Resend OTP

```bash
curl -X POST http://localhost:3000/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890"
  }'
```

**Expected Response (200 OK):**
```json
{
  "message": "OTP resent successfully"
}
```

---

## Testing Shift Management API (with Auth)

### Setup: Get Token from Seeded Test Account

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@shiftmaster.dev",
    "password": "SecurePassword123!"
  }'
```

**Save the returned token:**
```bash
export TOKEN="your-jwt-token-here"
```

### Test 6: List All Shifts (Requires Auth)

```bash
curl -X GET http://localhost:3000/api/shifts \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
[
  {
    "id": "shift-1",
    "operatorId": "operator-uuid",
    "siteId": "site-1",
    "craneId": "crane-1",
    "startTime": "2025-12-19T10:00:00.000Z",
    "endTime": "2025-12-19T18:00:00.000Z",
    "hours": 8,
    "operatorRate": 50,
    "siteRate": 150,
    "overrideOperatorRate": null,
    "overrideSiteRate": null,
    "approved": false,
    "approvedById": null,
    "createdAt": "2025-12-19T...",
    "operator": { "id": "...", "name": "John Operator", ... },
    "site": { "id": "...", "name": "Downtown Construction Site", ... },
    "crane": { "id": "...", "craneNumber": "CRANE-001", ... }
  },
  ...
]
```

### Test 7: Create New Shift (Requires Auth)

```bash
curl -X POST http://localhost:3000/api/shifts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operatorId": "operator-uuid-here",
    "siteId": "site-1",
    "craneId": "crane-1",
    "startTime": "2025-12-20T08:00:00Z",
    "endTime": "2025-12-20T16:00:00Z",
    "operatorRate": 50.00,
    "siteRate": 150.00
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": "new-shift-uuid",
  "operatorId": "...",
  "siteId": "site-1",
  "craneId": "crane-1",
  "startTime": "2025-12-20T08:00:00.000Z",
  "endTime": "2025-12-20T16:00:00.000Z",
  "hours": 8,
  "operatorRate": 50,
  "siteRate": 150,
  "approved": false,
  "approvedById": null,
  "createdAt": "2025-12-19T...",
  "operator": { ... },
  "site": { ... },
  "crane": { ... }
}
```

### Test 8: Approve Shift (SITE_MANAGER+ Only)

First, login as site manager:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@shiftmaster.dev",
    "password": "SecurePassword123!"
  }'
```

Then approve the shift:

```bash
export MANAGER_TOKEN="manager-jwt-token"
export SHIFT_ID="shift-1"

curl -X PATCH http://localhost:3000/api/shifts/$SHIFT_ID/approve \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response (200 OK):**
```json
{
  "id": "shift-1",
  "operatorId": "...",
  "siteId": "site-1",
  "approved": true,
  "approvedById": "manager-uuid",
  "approvedBy": {
    "id": "manager-uuid",
    "name": "Jane Manager",
    "email": "manager@shiftmaster.dev",
    "role": "SITE_MANAGER"
  },
  ...
}
```

### Test 9: Try to Approve as OPERATOR (Should Fail)

```bash
export OPERATOR_TOKEN="operator-jwt-token"

curl -X PATCH http://localhost:3000/api/shifts/shift-1/approve \
  -H "Authorization: Bearer $OPERATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response (403 Forbidden):**
```json
{
  "error": "Forbidden: requires one of SITE_MANAGER, PROJECT_MANAGER, COMPANY_ADMIN"
}
```

### Test 10: Update Shift (Requires Auth)

```bash
curl -X PATCH http://localhost:3000/api/shifts/$SHIFT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hours": 7.5,
    "overrideOperatorRate": 55.00
  }'
```

**Expected Response (200 OK):**
```json
{
  "id": "shift-id",
  "hours": 7.5,
  "overrideOperatorRate": 55,
  ...
}
```

### Test 11: Delete Shift (PROJECT_MANAGER+ Only)

```bash
export PM_TOKEN="project-manager-jwt-token"

curl -X DELETE http://localhost:3000/api/shifts/$SHIFT_ID \
  -H "Authorization: Bearer $PM_TOKEN"
```

**Expected Response (204 No Content)** - empty response, status 204

### Test 12: Try to Access Protected Route Without Token

```bash
curl -X GET http://localhost:3000/api/shifts
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "No token provided"
}
```

---

## Role-Based Access Control (RBAC) Summary

| Role | Abilities |
|------|-----------|
| **OPERATOR** | Create shifts, view all shifts, update own shift |
| **SITE_MANAGER** | All OPERATOR + approve shifts on managed site |
| **PROJECT_MANAGER** | All SITE_MANAGER + delete shifts |
| **COMPANY_ADMIN** | All permissions |

### Test RBAC Scenarios

#### Operator tries to delete (should fail):
```bash
curl -X DELETE http://localhost:3000/api/shifts/shift-1 \
  -H "Authorization: Bearer $OPERATOR_TOKEN"
```
> **Result:** 403 Forbidden

#### Project Manager deletes (should succeed):
```bash
curl -X DELETE http://localhost:3000/api/shifts/shift-1 \
  -H "Authorization: Bearer $PM_TOKEN"
```
> **Result:** 204 No Content

---

## Security Verification Checklist

- ✅ Token required for all /api/shifts endpoints
- ✅ No token required for /api/auth/register, /api/auth/login, /api/auth/verify-otp
- ✅ Approver identity comes from JWT (req.user.id), not client input
- ✅ Phone must be verified before login works
- ✅ OTP expires after 5 minutes
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Role-based access enforced at middleware level

---

## Troubleshooting

### Token Expired
If you get `Invalid token` error, generate a new token by logging in again.

### OTP Code Not Working
- Check the backend console output for the actual OTP code
- OTP is only valid for 5 minutes
- Each registration generates a new OTP

### Database Connection Error
- Verify DATABASE_URL is correct
- Check if PostgreSQL is running
- Run migrations: `npm run prisma migrate deploy`

### Phone Not Verified Error
- Use `/api/auth/verify-otp` endpoint first
- Check the OTP code from backend console

---

## Example End-to-End Workflow

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"+1111111111","password":"TestPass123!"}'

# 2. Note OTP from server console

# 3. Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+1111111111","code":"123456"}'

# 4. Save token from response
export TOKEN="..."

# 5. Create shift
curl -X POST http://localhost:3000/api/shifts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"operatorId":"...","siteId":"site-1","craneId":"crane-1","startTime":"2025-12-20T08:00:00Z","endTime":"2025-12-20T16:00:00Z","operatorRate":50,"siteRate":150}'

# 6. List shifts
curl -X GET http://localhost:3000/api/shifts \
  -H "Authorization: Bearer $TOKEN"
```

---

## Next Steps

- Integrate with React Native frontend using the FRONTEND-AUTH-EXAMPLE.md guide
- Add rate limiting to auth endpoints
- Implement token refresh mechanism (currently 7-day expiry)
- Add audit logging for auth attempts
- Set up production Twilio account for real SMS
