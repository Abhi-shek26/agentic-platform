#!/bin/bash

# E2E Test Runner Script
# Runs complete end-to-end integration tests

set -e

echo ""
echo "=========================================================================="
echo "🧪 E2E TEST SETUP"
echo "=========================================================================="
echo ""

# Check if environment variables are set
echo "✓ Setting up environment..."
export MOCK_AGENTS=true
export NODE_ENV=test
export E2E_TESTS=true

echo "✓ MOCK_AGENTS=$MOCK_AGENTS"
echo "✓ NODE_ENV=$NODE_ENV"
echo "✓ E2E_TESTS=$E2E_TESTS"
echo ""

# Check Redis
echo "✓ Checking Redis connection..."
if redis-cli ping &> /dev/null; then
    echo "  ✓ Redis is running on localhost:6379"
else
    echo "  ⚠️  Redis might not be running. Please start it:"
    echo "     docker run -p 6379:6379 redis:7"
    exit 1
fi

echo ""
echo "=========================================================================="
echo "📝 RUNNING E2E TESTS"
echo "=========================================================================="
echo ""

# Run E2E tests
cd "$(dirname "$0")/.."
npm run test:e2e

echo ""
echo "=========================================================================="
echo "✅ E2E Tests Complete!"
echo "=========================================================================="
