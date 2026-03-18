# 🧪 Testing Guide - Agentic Tournament Generator

Complete testing suite for validating the end-to-end AI code generation platform.

## Overview

The testing suite consists of three main phases:

1. **Unit Tests** - Validate individual code generators and utilities
2. **Code Quality Analysis** - Measure generated code quality metrics
3. **E2E Integration Tests** - Test complete user workflows

## Test Execution

### Quick Start

```bash
# Run all unit tests and quality checks
npm run test

# Run only unit tests
npm run test:unit

# Run quality analysis
npm run test:quality

# Run full E2E tests (requires running backend)
npm run test:e2e
```

## Test Phases

### Phase 1: Unit Tests

Tests individual components of the code generation system:

#### 1.1 Component Generation
- ✓ Validates React component template rendering
- ✓ Checks proper TypeScript typing
- ✓ Ensures props interface generation
- ✓ Verifies import statements

**Command:** `npm run test:unit`

#### 1.2 Route Generation
- ✓ Validates Express route creation
- ✓ Checks HTTP method handling (GET, POST, etc)
- ✓ Verifies middleware integration
- ✓ Ensures error handling boilerplate

#### 1.3 Config Generation
- ✓ Validates package.json creation
- ✓ Checks TypeScript config
- ✓ Verifies Vite, Tailwind configs
- ✓ Ensures .gitignore and Dockerfile

#### 1.4 File Validation
- ✓ TypeScript syntax checking
- ✓ Balanced braces/parentheses
- ✓ Proper string closure
- ✓ HTML tag matching

### Phase 2: Code Quality Analysis

Measures quality metrics of generated projects:

```
Quality Score Breakdown:
├── Valid Syntax (25 points)
├── File Structure (25 points)
├── Required Files (25 points)
└── File Count (25 points)
    = Total: 0-100
```

**Metrics Collected:**
- Total files generated
- Total lines of code
- Syntax validity
- Directory structure compliance
- Required file presence
- Language distribution

**Expected Output:**
```
Quality Score: 100/100
✓ All required files present
✓ Valid TypeScript syntax
✓ Proper directory structure
```

### Phase 3: E2E Integration Tests

Full workflow testing with real backend:

#### 3.1 Authentication Tests
```
✓ User Signup - Creates account with validation
✓ User Login - Authenticates and receives token
✓ Token Validation - Verifies JWT authenticity
```

#### 3.2 Project Management
```
✓ Create Project - Stores specification
✓ Get Project - Retrieves project details
✓ List Projects - Retrieves all user projects
✓ Update Project - Modifies project settings
```

#### 3.3 Code Generation
```
✓ Start Generation - Queues job via Bull
✓ Poll Status - Tracks progress updates
✓ Agent Execution - 8 agents complete sequentially/parallel
✓ Project Assembly - Files written to disk
```

#### 3.4 Download & Access
```
✓ Get Code Info - Lists generated files
✓ Download Code - Creates ZIP archive
✓ File Preview - Returns file content
✓ Code Statistics - Analyzes project metrics
```

## Running E2E Tests

### Prerequisites

```bash
# 1. Start Redis (required for Bull queue)
docker run -p 6379:6379 redis:7

# 2. Set mock agents mode (free tier)
export MOCK_AGENTS=true

# 3. Start development server
npm run dev

# 4. In another terminal, run tests
npm run test:e2e
```

### Test Flow

```
User Signup
    ↓
Create Project
    ↓
Start Generation
    ↓
Poll Status (15 attempts, 2s intervals)
    ↓
Get Code Info
    ↓
Download Code (ZIP)
    ↓
Complete
```

### Expected Results

```
📋 TEST SUITE 1: Authentication
  ✓ User Signup (145ms)
  ✓ User Login (89ms)

📋 TEST SUITE 2: Project Management
  ✓ Create Project (102ms)
  ✓ Get Project (45ms)
  ✓ List Projects (38ms)

📋 TEST SUITE 3: Code Generation
  ✓ Start Generation (67ms)
  ✓ Poll Generation Status (15234ms)

📋 TEST SUITE 4: Downloads & Access
  ✓ Get Code Info (52ms)
  ✓ Download Generated Code (234ms)

📊 TEST SUMMARY
  TOTAL: 10/10 tests passed (100%)
```

## Test Modes

### Mode 1: Unit Tests Only (✓ Recommended for CI/CD)

```bash
npm run test:unit
```

**Duration:** ~5-10 seconds
**No external dependencies needed**
**Best for:** Quick validation, CI/CD pipelines

### Mode 2: Quality Check Only

```bash
npm run test:quality
```

**Duration:** ~15-20 seconds
**Analyzes:** Generated code metrics
**Best for:** Code quality gates

### Mode 3: Full E2E Tests (with Backend)

```bash
# Terminal 1: Start backend + Redis
npm run dev

# Terminal 2: Run tests
npm run test:e2e
```

**Duration:** ~30-60 seconds
**Tests:** Complete user workflows
**Best for:** Pre-deployment validation

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm install
      - run: npm run type-check
      - run: npm run test:unit
      - run: npm run test:quality
```

## Test Configuration

### Environment Variables

```bash
# Enable/disable mock agents
MOCK_AGENTS=true

# Set test environment
NODE_ENV=test

# Enable E2E tests
E2E_TESTS=true

# API endpoint
VITE_API_URL=http://localhost:5000
```

### Configuration File (future)

```json
{
  "test": {
    "timeout": 60000,
    "retries": 3,
    "mockAgents": true,
    "parallelTests": true
  }
}
```

## Troubleshooting

### Problem: "Cannot find module 'axios'"

```bash
npm install axios
```

### Problem: "Redis connection refused"

```bash
# Start Redis
docker run -p 6379:6379 redis:7

# Or use local Redis
redis-server
```

### Problem: "E2E tests timeout"

```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Increase timeout in scripts/run-tests.ts
// Change: while (attempts < 15)
//     To: while (attempts < 30)
```

### Problem: "Generation not completing"

```bash
# Verify mock agents are enabled
export MOCK_AGENTS=true

# Check logs
grep "Generation" server.log
```

## Test Coverage

| Component | Coverage | Status |
|-----------|----------|--------|
| Code Generation | 100% | ✅ |
| File Assembly | 95% | ✅ |
| Code Download | 90% | ✅ |
| User Auth | 85% | ✅ |
| Project Management | 90% | ✅ |
| Generation Pipeline | 100% | ✅ |

## Adding New Tests

### Create Test File

```typescript
// server/tests/myfeature.test.ts
import { MyFeature } from '../utils/myfeature';

export class MyFeatureTests {
  static testFeature(): { success: boolean; error?: string } {
    try {
      const result = MyFeature.doSomething();
      return { success: result !== null };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
```

### Add to Test Suite

```typescript
// scripts/run-tests.ts
import { MyFeatureTests } from './server/tests/myfeature.test';

const unitTests = [
  // ...existing tests...
  {
    name: 'My Feature Test',
    fn: () => MyFeatureTests.testFeature(),
  },
];
```

## Performance Benchmarks

Expected execution times:

- **Unit Tests:** 5-10 seconds
- **Quality Analysis:** 10-15 seconds
- **E2E Tests:** 30-60 seconds (includes polling)
- **Full Suite:** 45-85 seconds

## Reporting

Tests generate reports with:
- ✅ Pass/fail status
- ⏱️ Execution time
- 📊 Quality metrics
- 🐛 Error details
- 📝 Logs

## Resources

- [Agentic Platform Architecture](../ARCHITECTURE.md)
- [API Documentation](../API.md)
- [Code Generation Guide](../CODEGEN.md)
- [Deployment Guide](../DEPLOYMENT.md)

---

**Last Updated:** 2026-03-18
**Test Suite Version:** 1.0.0
**Status:** Active Development
