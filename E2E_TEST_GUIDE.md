# 🌐 E2E Test Execution Guide

## Prerequisites ✅

Your system is ready:
- ✅ Redis running on localhost:6379
- ✅ Node.js installed
- ✅ Test suite configured

## Running E2E Tests (3 Steps)

### Step 1: Start Development Server (Terminal 1)

```bash
cd /c/Users/HELLO/Desktop/Codings/agentic-platform
npm run dev
```

**Expected output:**
```
🔐 Authentication: ✓ Configured
🗄️  Database: ✓ Ready
📨 Session Store: ✓ Configured
🤖 Gemini API: ✓ Configured (MOCK_AGENTS=true)
🔴 Redis Queue: ✓ Connected & Ready
Server running on http://localhost:5000
```

**Keep this terminal open!**

---

### Step 2: Run E2E Tests (Terminal 2)

```bash
cd /c/Users/HELLO/Desktop/Codings/agentic-platform
npm run test:e2e
```

---

## Test Flow Breakdown

The E2E test suite runs 4 test suites in sequence:

### 📋 Suite 1: Authentication (2 tests)
```
✓ User Signup
  - Creates account with email, username, password
  - Validates strong password requirements
  - Returns JWT token

✓ User Login
  - Authenticates existing user
  - Verifies token validity
  - Returns user data
```

**Expected duration:** ~150-250ms

---

### 📋 Suite 2: Project Management (3 tests)
```
✓ Create Project
  - Accepts tournament specification
  - Stores project with status='draft'
  - Returns project ID

✓ Get Project
  - Retrieves project by ID
  - Validates ownership
  - Returns full specification

✓ List Projects
  - Fetches all user projects
  - Returns status and metadata
  - Validates permissions
```

**Expected duration:** ~150-200ms

---

### 📋 Suite 3: Code Generation (2 tests)
```
✓ Start Generation
  - Creates Bull queue job
  - Sets initial status to 'processing'
  - Returns jobId

✓ Poll Generation Status
  - Polls every 2 seconds for updates
  - Waits up to 30 seconds for completion
  - Tracks agent progress
  - Detects mock agent responses
```

**Expected duration:** ~15,000-20,000ms (30-second polling timeout)

---

### 📋 Suite 4: Downloads & Access (2 tests)
```
✓ Get Code Info
  - Lists generated files and structure
  - Returns statistics (file count, lines of code)
  - Validates directory organization

✓ Download Generated Code
  - Creates ZIP archive automatically
  - Validates Content-Type=application/zip
  - Returns file for download
  - Cleans up temp files
```

**Expected duration:** ~300-500ms

---

## Expected Results

### Success (All Passing) ✅

```
======================================================================
                    📋 TEST SUITE 1: Authentication
======================================================================

  ✓ User Signup (145ms)
    User ID: user-12345678
  ✓ User Login (89ms)
    Authenticated as testuser1234567890

──────────────────────────────────────────────────────────────────────

                  📋 TEST SUITE 2: Project Management
======================================================================

  ✓ Create Project (102ms)
    Project ID: proj-abc123def456
  ✓ Get Project (45ms)
    Status: draft
  ✓ List Projects (38ms)
    Found 1 project(s)

──────────────────────────────────────────────────────────────────────

                    📋 TEST SUITE 3: Code Generation
======================================================================

  ✓ Start Generation (67ms)
    Job ID: generation-proj-abc123def456
  ✓ Poll Generation Status (15234ms)
    Attempt 1: processing (5%) - Initializing...
    Attempt 2: processing (15%) - Spec Parser completed
    Attempt 3: processing (30%) - Architect designing...
    Attempt 4: processing (60%) - Code generation in parallel...
    Attempt 5: processing (90%) - Validating code...
    Attempt 6: completed (100%) - Website generation complete!

──────────────────────────────────────────────────────────────────────

                    📋 TEST SUITE 4: Downloads & Access
======================================================================

  ✓ Get Code Info (52ms)
    11 files, 253KB
  ✓ Download Generated Code (234ms)
    ZIP file: 45.3KB

======================================================================
📊 TEST REPORT SUMMARY
======================================================================

  Timestamp: 2026-03-18T18:30:45.123Z
  Environment: development

  Unit Tests: 4/4 passed
  Code Quality Score: 100/100
  E2E Tests: 9/9 passed

  ✅ Overall Status: ALL TESTS PASSING

Duration breakdown:
  - Auth Tests: 234ms
  - Project Tests: 185ms
  - Generation Tests: 15301ms (polling)
  - Download Tests: 286ms
  ────────────────
  TOTAL: 16,006ms (≈16 seconds)

──────────────────────────────────────────────────────────────────────
```

---

## Troubleshooting

### Problem: "Redis connection refused"
```bash
# Start Redis
docker run -p 6379:6379 redis:7

# Or check if already running
docker ps | grep redis
```

### Problem: "Cannot connect to server"
Make sure backend is running (see Step 1):
```bash
npm run dev
# Should show "Server running on http://localhost:5000"
```

### Problem: "Generation timeout"
The test polls for up to 30 seconds. If still failing:
1. Check backend logs for errors
2. Verify mock agents are enabled: `export MOCK_AGENTS=true`
3. May need more time on slower systems

### Problem: "401 Unauthorized"
Check auth token handling:
```bash
# Verify signup endpoint works
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"TestPass123!"}'
```

---

## Test Metrics to Track

After running tests, monitor these metrics:

| Metric | Acceptable | Excellent |
|--------|-----------|-----------|
| Auth Tests | < 300ms | < 200ms |
| Project Creation | < 150ms | < 100ms |
| Generation Poll | < 30s | < 20s |
| Download Speed | < 1s | < 500ms |
| **Total E2E** | < 35s | < 22s |
| Pass Rate | 90% | 100% |

---

## CI/CD Integration

To run in GitHub Actions:

```yaml
- name: Run E2E Tests
  run: |
    npm install
    npm run test:unit  # Quick test first
    npm run test:e2e   # Full suite
  services:
    redis:
      image: redis:7
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 10s
      ports:
        - 6379:6379
```

---

## Success Criteria ✅

E2E tests are successful if:

1. ✅ All 4 test suites pass (9 tests total)
2. ✅ No authentication errors
3. ✅ Project creation succeeds
4. ✅ Code generation completes
5. ✅ File download works
6. ✅ Total duration < 35 seconds
7. ✅ No memory leaks
8. ✅ Clean exit (exit code 0)

---

## Next Steps After E2E Success

Once E2E tests pass completely:

### ✅ Option 1: Prepare for Production
- Deploy to cloud platform
- Set up CI/CD pipeline
- Configure monitoring
- Scale infrastructure

### ✅ Option 2: Phase 3 - Real Claude Agents
- Replace mock agents with Claude API
- Implement quality improvements
- Add multi-agent refinement

### ✅ Option 3: Enhanced Features
- Code preview editor
- GitHub integration
- Deployment automation
- Template library

---

**Estimated time to complete: 20-30 seconds**

Good luck! 🚀
