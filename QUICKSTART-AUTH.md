# 🚀 Quick Reference: Auth Commands

## Environment Setup
```bash
cp .env.example .env
# Edit .env with JWT_SECRET and DATABASE_URL
```

## Start Backend
```bash
cd backend
npm install  # if needed
npm run dev
# Server runs on localhost:3000
```

## Register User (OPERATOR role)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Operator",
    "email": "john@example.com",
    "phone": "555-0123",
    "password": "password123",
    "role": "OPERATOR"
  }' | jq .
```

## Register User (SITE_MANAGER role)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Manager",
    "email": "alice@example.com",
    "phone": "555-4567",
    "password": "password123",
    "role": "SITE_MANAGER"
  }' | jq .
```

## Login & Get Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }' | jq .
```

## Login & Extract Token (Bash)
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}' | jq -r '.token')

echo $TOKEN
```

## Get Profile
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## Test Shift Endpoint (Protected)
```bash
curl -X GET http://localhost:3000/api/shifts \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## Create Shift (Requires Auth)
```bash
curl -X POST http://localhost:3000/api/shifts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "operatorId": "operator-uuid",
    "siteId": "site-uuid",
    "craneId": "crane-uuid",
    "startTime": "2025-01-20T08:00:00Z",
    "endTime": "2025-01-20T16:00:00Z",
    "operatorRate": 50.00,
    "siteRate": 150.00
  }' | jq .
```

## Approve Shift (SITE_MANAGER+ only)
```bash
curl -X PATCH http://localhost:3000/api/shifts/shift-uuid/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SITE_MANAGER_TOKEN" \
  -d '{
    "approvedById": "site-manager-uuid"
  }' | jq .
```

## Delete Shift (PROJECT_MANAGER+ only)
```bash
curl -X DELETE http://localhost:3000/api/shifts/shift-uuid \
  -H "Authorization: Bearer $PROJECT_MANAGER_TOKEN" \
  -v
```

## Run Full Test Suite
```bash
./test-auth.sh
```

## View All Commits
```bash
git log --oneline | head -5
```

---

## Role Permissions Matrix

| Endpoint | OPERATOR | SITE_MGR | PROJECT_MGR | COMPANY_ADMIN |
|----------|----------|----------|-------------|---------------|
| GET /shifts | ✅ | ✅ | ✅ | ✅ |
| POST /shifts | ✅ | ✅ | ✅ | ✅ |
| PATCH /shifts/:id | ✅ | ✅ | ✅ | ✅ |
| PATCH /shifts/:id/approve | ❌ | ✅ | ✅ | ✅ |
| DELETE /shifts/:id | ❌ | ❌ | ✅ | ✅ |

---

## Useful Aliases (Add to .bashrc or .zshrc)

```bash
# Register operator
alias shiftmaster-register='curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d'

# Login and store token
alias shiftmaster-login='TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d'"{\"email\":\""'$1'"'\",\"password\":\""'$2'"'\"}" | jq -r ".token") && echo "Token: $TOKEN"'

# Get shifts
alias shiftmaster-shifts='curl -X GET http://localhost:3000/api/shifts -H "Authorization: Bearer $TOKEN"'

# Test backend status
alias shiftmaster-health='curl http://localhost:3000/ && echo'
```

---

**Last Updated:** December 19, 2025
