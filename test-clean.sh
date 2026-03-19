#!/bin/bash

echo "=== CORRECTED E2E TEST ==="
echo ""

TIMESTAMP=$(date +%s%N)
TEST_EMAIL="test${TIMESTAMP}@example.com"
TEST_USERNAME="user$((RANDOM % 10000))"
TEST_PASSWORD="TestPass123"

echo "1. Signup..."
SIGNUP=$(curl -s -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "email": "$TEST_EMAIL",
  "username": "$TEST_USERNAME",
  "password": "$TEST_PASSWORD",
  "displayName": "Test User"
}
JSON
)

TOKEN=$(echo "$SIGNUP" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)
USER_ID=$(echo "$SIGNUP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Signup failed:"
  echo "$SIGNUP"
  exit 1
fi

echo "✅ Token: ${TOKEN:0:20}..."
echo ""

echo "2. Create project..."
CREATE=$(curl -s -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<JSON
{
  "name": "Chess Championship 2026",
  "slug": "chess-championship-2026",
  "description": "Annual chess tournament",
  "specification": {
    "tournamentName": "Chess Championship",
    "date": "2026-04-20",
    "location": "San Francisco",
    "description": "Chess tournament",
    "pages": ["home", "info", "register"],
    "colorScheme": "modern"
  }
}
JSON
)

echo "Create response:"
echo "$CREATE"
echo ""

PROJECT_ID=$(echo "$CREATE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "id" ]]; then
  echo "❌ Failed to create project"
  exit 1
fi

echo "✅ Project ID: $PROJECT_ID"
echo ""

echo "3. List projects..."
LIST=$(curl -s -X GET http://localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN")

echo "Projects:"
echo "$LIST"
PROJECT_COUNT=$(echo "$LIST" | grep -o '"id"' | wc -l)
echo "Count: $PROJECT_COUNT"
echo ""

echo "4. Get project..."
GET=$(curl -s -X GET http://localhost:5000/api/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN")

echo "Project details:"
echo "$GET"
echo ""

if echo "$GET" | grep -q '"id"'; then
  echo "✅ ALL TESTS PASSED!"
else
  echo "❌ Final test failed"
  exit 1
fi
