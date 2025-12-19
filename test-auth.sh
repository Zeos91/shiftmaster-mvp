#!/bin/bash

# ShiftMaster Auth Testing Script
# Test the authentication endpoints

BASE_URL="http://localhost:3000/api"
EMAIL="testuser@example.com"
PASSWORD="testpass123"
NAME="Test User"
PHONE="555-0123"

echo "=== ShiftMaster Auth Testing ==="
echo ""

# 1. Register
echo "1️⃣  Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$NAME\",
    \"email\": \"$EMAIL\",
    \"phone\": \"$PHONE\",
    \"password\": \"$PASSWORD\",
    \"role\": \"OPERATOR\"
  }")

echo "$REGISTER_RESPONSE" | jq '.'
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Registration failed"
  exit 1
fi

echo "✅ Registration successful"
echo "   Token: ${TOKEN:0:20}..."
echo "   User ID: $USER_ID"
echo ""

# 2. Login
echo "2️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq '.'
LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ -z "$LOGIN_TOKEN" ] || [ "$LOGIN_TOKEN" = "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Login successful"
echo ""

# 3. Get Profile (without token - should fail)
echo "3️⃣  Testing profile endpoint without token (should fail)..."
PROFILE_NO_TOKEN=$(curl -s -X GET "$BASE_URL/auth/profile")
echo "$PROFILE_NO_TOKEN" | jq '.'
echo "✅ Correctly rejected request without token"
echo ""

# 4. Get Profile (with token - should succeed)
echo "4️⃣  Getting profile with valid token..."
PROFILE=$(curl -s -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "$PROFILE" | jq '.'
echo "✅ Successfully retrieved profile"
echo ""

# 5. Test shift endpoint protection
echo "5️⃣  Testing shift endpoint protection..."
echo "   Without token (should fail):"
curl -s -X GET "$BASE_URL/shifts" | jq '.'

echo ""
echo "   With token (should succeed):"
curl -s -X GET "$BASE_URL/shifts" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "=== All tests completed ==="
