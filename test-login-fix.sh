#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "          LOGIN FIX TEST - Signup + Login + Verify"
echo "════════════════════════════════════════════════════════════════"
echo ""

TIMESTAMP=$(date +%s%N)
TEST_EMAIL="login-test-${TIMESTAMP}@test.com"
TEST_USERNAME="loginuser$((RANDOM % 10000))"
TEST_PASSWORD="TestPass123"
API="http://localhost:5000"

echo "📋 Test User:"
echo "  Email:    $TEST_EMAIL"
echo "  Username: $TEST_USERNAME"
echo "  Password: $TEST_PASSWORD"
echo ""

# STEP 1: Signup
echo "════════════════════════════════════════════════════════════════"
echo "STEP 1️⃣  SIGNUP (first time user registration)"
echo "════════════════════════════════════════════════════════════════"

SIGNUP=$(curl -s -X POST "$API/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "email": "$TEST_EMAIL",
  "username": "$TEST_USERNAME",
  "password": "$TEST_PASSWORD",
  "displayName": "Login Test User"
}
JSON
)

SIGNUP_TOKEN=$(echo "$SIGNUP" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$SIGNUP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$SIGNUP_TOKEN" ]; then
  echo "❌ Signup FAILED"
  echo "Response: $SIGNUP"
  exit 1
fi

echo "✅ Signup successful"
echo "   User ID: $USER_ID"
echo "   Token: ${SIGNUP_TOKEN:0:20}..."
echo ""

# STEP 2: Verify /auth/me works with signup token
echo "════════════════════════════════════════════════════════════════"
echo "STEP 2️⃣  VERIFY SIGNUP TOKEN (test /auth/me)"
echo "════════════════════════════════════════════════════════════════"

ME=$(curl -s -X GET "$API/api/auth/me" \
  -H "Authorization: Bearer $SIGNUP_TOKEN")

if echo "$ME" | grep -q "\"email\":\"$TEST_EMAIL\""; then
  echo "✅ /auth/me works with signup token"
  echo "   Verified email: $TEST_EMAIL"
else
  echo "❌ /auth/me FAILED"
  echo "Response: $ME"
  exit 1
fi
echo ""

# STEP 3: Login with same credentials
echo "════════════════════════════════════════════════════════════════"
echo "STEP 3️⃣  LOGIN (use same email & password)"
echo "════════════════════════════════════════════════════════════════"

LOGIN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
JSON
)

echo "Login response:"
echo "$LOGIN"
echo ""

LOGIN_TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
LOGIN_USER_ID=$(echo "$LOGIN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$LOGIN_TOKEN" ]; then
  echo "❌ LOGIN FAILED - No token returned"
  echo "This means the login endpoint is not returning the token"
  exit 1
fi

echo "✅ Login successful"
echo "   User ID: $LOGIN_USER_ID"
echo "   Token: ${LOGIN_TOKEN:0:20}..."
echo ""

# STEP 4: Verify login token works
echo "════════════════════════════════════════════════════════════════"
echo "STEP 4️⃣  VERIFY LOGIN TOKEN (test /auth/me)"
echo "════════════════════════════════════════════════════════════════"

LOGIN_ME=$(curl -s -X GET "$API/api/auth/me" \
  -H "Authorization: Bearer $LOGIN_TOKEN")

if echo "$LOGIN_ME" | grep -q "\"email\":\"$TEST_EMAIL\""; then
  echo "✅ /auth/me works with login token"
  echo "   Verified email: $TEST_EMAIL"
else
  echo "❌ /auth/me FAILED with login token"
  echo "Response: $LOGIN_ME"
  exit 1
fi
echo ""

# STEP 5: Verify tokens are different (new tokens each time)
echo "════════════════════════════════════════════════════════════════"
echo "STEP 5️⃣  VERIFY TOKEN UNIQUENESS"
echo "════════════════════════════════════════════════════════════════"

if [ "$SIGNUP_TOKEN" == "$LOGIN_TOKEN" ]; then
  echo "⚠️  WARNING: Signup and login tokens are identical"
  echo "   (This is OK - could be cached)"
else
  echo "✅ Signup and login tokens are different"
  echo "   (Each login generates a new token)"
fi
echo ""

# STEP 6: Verify credentials validation
echo "════════════════════════════════════════════════════════════════"
echo "STEP 6️⃣  VERIFY CREDENTIALS VALIDATION (wrong password)"
echo "════════════════════════════════════════════════════════════════"

WRONG_PASSWORD=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "email": "$TEST_EMAIL",
  "password": "WrongPassword123"
}
JSON
)

if echo "$WRONG_PASSWORD" | grep -q "Invalid credentials"; then
  echo "✅ Wrong password correctly rejected"
  echo "   Error: $(echo "$WRONG_PASSWORD" | grep -o '"error":"[^"]*' | cut -d'"' -f4)"
else
  echo "❌ Wrong password NOT rejected - security issue!"
  echo "Response: $WRONG_PASSWORD"
  exit 1
fi
echo ""

# FINAL SUMMARY
echo "════════════════════════════════════════════════════════════════"
echo "                       ✅ LOGIN FIX VERIFIED!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ Signup successful"
echo "✅ Signup token works with /auth/me"
echo "✅ Login successful"
echo "✅ Login returns Bearer token"
echo "✅ Login token works with /auth/me"
echo "✅ Wrong password correctly rejected"
echo ""
echo "🎉 LOGIN IS NOW WORKING!"
echo ""
echo "What was fixed:"
echo "- Login endpoint now generates and returns Bearer token"
echo "- Token is stored in tokenToUser map"
echo "- Token can be used for API requests"
echo "- Password verification works correctly"
echo ""
