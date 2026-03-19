#!/bin/bash

# Detailed E2E test with verbose output

echo "=== BACKEND E2E TEST WITH VERBOSE OUTPUT ==="
echo ""

TIMESTAMP=$(date +%s%3N)
TEST_EMAIL="test${TIMESTAMP}@example.com"
TEST_USERNAME="user$((RANDOM % 10000))"
TEST_PASSWORD="TestPass123"

echo "🔴 STEP 1: Signup"
echo "Email: $TEST_EMAIL"
SIGNUP=$(curl -s http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"username\":\"$TEST_USERNAME\",\"password\":\"$TEST_PASSWORD\",\"displayName\":\"Test\"}")

echo "Response: $SIGNUP"
TOKEN=$(echo "$SIGNUP" | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)
USER_ID=$(echo "$SIGNUP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ FAILED: No token in response"
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:20}..."
echo "✅ User ID: $USER_ID"
echo ""

echo "🔴 STEP 2: List projects (should be empty)"
LIST1=$(curl -s http://localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $LIST1"
echo ""

echo "🔴 STEP 3: Create project"
PROJECT_NAME="Test Tournament"
SLUG="test-tournament"
OUR_SPEC='{
  "tournamentName":"'$PROJECT_NAME'",
  "date":"2026-04-20",
  "location":"San Francisco",
  "description":"Test",
  "pages":["home","info","register"],
  "colorScheme":"modern"
}'

echo "Creating with:"
echo "  Name: $PROJECT_NAME"
echo "  Slug: $SLUG"
echo "  Spec: $OUR_SPEC"

CREATE=$(curl -s -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"'$PROJECT_NAME'",
    "slug":"'$SLUG'",
    "description":"Test project",
    "specification":'"$OUR_SPEC"'
  }')

echo "Response: $CREATE"
PROJECT_ID=$(echo "$CREATE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Extracted Project ID: $PROJECT_ID"
echo ""

if [[ "$PROJECT_ID" == "id" || -z "$PROJECT_ID" ]]; then
  echo "⚠️  WARNING: Project ID extraction may have failed"
  echo "Full response was: $CREATE"
  PROJECT_ID=$(echo "$CREATE" | jq -r '.project.id // empty')
  echo "Trying jq extraction: $PROJECT_ID"
fi

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "null" ]; then
  echo "❌ FAILED: Could not extract project ID"
  exit 1
fi

echo "✅ Project created with ID: $PROJECT_ID"
echo ""

echo "🔴 STEP 4: List projects again (should have 1)"
LIST2=$(curl -s http://localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $LIST2"
echo "Count: $(echo "$LIST2" | grep -o '"id"' | wc -l) projects"
echo ""

echo "🔴 STEP 5: Get specific project"
GET=$(curl -s http://localhost:5000/api/projects/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $GET"
echo ""

echo "=== TEST COMPLETE ==="
