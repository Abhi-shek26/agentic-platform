/**
 * End-to-End Integration Tests
 * Tests complete flow: Project Creation → Generation → Download
 * Uses mock agents to avoid API quota consumption
 */

import axios, { AxiosInstance } from 'axios';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  total: number;
  duration: number;
}

class E2ETestRunner {
  private api: AxiosInstance;
  private baseURL: string;
  private testResults: TestResult[] = [];
  private authToken?: string;
  private userId?: string;
  private projectId?: string;
  private testSuffix: string;

  constructor(baseURL: string = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL,
      validateStatus: () => true, // Don't throw on any status
    });
    // Generate unique suffix for test credentials (max 5 chars to keep username under 20 chars)
    this.testSuffix = Math.random().toString(36).substring(2, 7);
  }

  /**
   * Log test result
   */
  private logTest(result: TestResult): void {
    const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⊘';
    const color =
      result.status === 'PASS'
        ? '\x1b[32m'
        : result.status === 'FAIL'
          ? '\x1b[31m'
          : '\x1b[33m';
    const reset = '\x1b[0m';

    console.log(
      `  ${color}${icon}${reset} ${result.name} (${result.duration}ms)${result.error ? ` - ${result.error}` : ''}`
    );
    if (result.details) {
      console.log(`     ${result.details}`);
    }
  }

  /**
   * Run a single test
   */
  private async runTest(
    name: string,
    testFn: () => Promise<{ success: boolean; error?: string; details?: string }>
  ): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      const testResult: TestResult = {
        name,
        status: result.success ? 'PASS' : 'FAIL',
        duration,
        error: result.error,
        details: result.details,
      };

      this.testResults.push(testResult);
      this.logTest(testResult);
      return testResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        name,
        status: 'FAIL',
        duration,
        error: error instanceof Error ? error.message : String(error),
      };

      this.testResults.push(testResult);
      this.logTest(testResult);
      return testResult;
    }
  }

  /**
   * TEST SUITE 1: Authentication Tests
   */
  async testAuthentication(): Promise<TestSuite> {
    console.log('\n📋 TEST SUITE 1: Authentication\n');
    const startTime = Date.now();
    const tests: TestResult[] = [];

    // Test 1.1: Signup
    const signupResult = await this.runTest('User Signup', async () => {
      const response = await this.api.post('/api/auth/signup', {
        email: `test${this.testSuffix}@example.com`,
        username: `user${this.testSuffix}`,
        password: 'TestPassword123!',
        displayName: 'Test User',
      });

      if (response.status !== 201) {
        return { success: false, error: `Expected 201, got ${response.status}` };
      }

      if (!response.data.user?.id) {
        return { success: false, error: 'No user ID in response' };
      }

      this.userId = response.data.user.id;
      this.authToken = response.data.token;

      // Debug: log if token is missing
      if (!this.authToken) {
        console.log('    ⚠️  Token not in response:', JSON.stringify(response.data));
      }

      return { success: true, details: `User ID: ${this.userId}` };
    });
    tests.push(signupResult);

    // Test 1.2: Login
    const loginResult = await this.runTest('User Login', async () => {
      if (!this.authToken) {
        return { success: false, error: 'Signup failed, skipping' };
      }

      const response = await this.api.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${this.authToken}` },
      });

      if (response.status !== 200) {
        return { success: false, error: `Expected 200, got ${response.status}` };
      }

      return { success: true, details: `Authenticated as ${response.data.user?.username}` };
    });
    tests.push(loginResult);

    const duration = Date.now() - startTime;
    return {
      name: 'Authentication',
      tests,
      passed: tests.filter((t) => t.status === 'PASS').length,
      failed: tests.filter((t) => t.status === 'FAIL').length,
      total: tests.length,
      duration,
    };
  }

  /**
   * TEST SUITE 2: Project Management Tests
   */
  async testProjectManagement(): Promise<TestSuite> {
    console.log('\n📋 TEST SUITE 2: Project Management\n');
    const startTime = Date.now();
    const tests: TestResult[] = [];

    // Test 2.1: Create Project
    const createResult = await this.runTest('Create Project', async () => {
      if (!this.authToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await this.api.post(
        '/api/projects',
        {
          name: 'Test Tournament Website',
          slug: `test-tournament-${this.testSuffix}`,
          description: 'A test tournament for E2E testing',
          specification: {
            tournamentName: 'Test Chess Championship',
            date: '2026-06-15',
            location: 'San Francisco',
            description: 'Test tournament',
            pages: ['home', 'info', 'register'],
            colorScheme: 'modern',
          },
        },
        {
          headers: { Authorization: `Bearer ${this.authToken}` },
        }
      );

      if (response.status !== 201) {
        return { success: false, error: `Expected 201, got ${response.status}` };
      }

      if (!response.data.project?.id) {
        return { success: false, error: 'No project ID in response' };
      }

      this.projectId = response.data.project.id;
      return { success: true, details: `Project ID: ${this.projectId}` };
    });
    tests.push(createResult);

    // Test 2.2: Get Project
    const getResult = await this.runTest('Get Project', async () => {
      if (!this.authToken || !this.projectId) {
        return { success: false, error: 'Missing auth or project ID' };
      }

      const response = await this.api.get(`/api/projects/${this.projectId}`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
      });

      if (response.status !== 200) {
        return { success: false, error: `Expected 200, got ${response.status}` };
      }

      return { success: true, details: `Status: ${response.data.project?.status}` };
    });
    tests.push(getResult);

    // Test 2.3: List Projects
    const listResult = await this.runTest('List Projects', async () => {
      if (!this.authToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await this.api.get('/api/projects', {
        headers: { Authorization: `Bearer ${this.authToken}` },
      });

      if (response.status !== 200) {
        return { success: false, error: `Expected 200, got ${response.status}` };
      }

      const count = response.data.projects?.length || 0;
      return { success: true, details: `Found ${count} project(s)` };
    });
    tests.push(listResult);

    const duration = Date.now() - startTime;
    return {
      name: 'Project Management',
      tests,
      passed: tests.filter((t) => t.status === 'PASS').length,
      failed: tests.filter((t) => t.status === 'FAIL').length,
      total: tests.length,
      duration,
    };
  }

  /**
   * TEST SUITE 3: Code Generation Tests
   */
  async testCodeGeneration(): Promise<TestSuite> {
    console.log('\n📋 TEST SUITE 3: Code Generation\n');
    const startTime = Date.now();
    const tests: TestResult[] = [];

    // Test 3.1: Start Generation
    const startGenResult = await this.runTest('Start Generation', async () => {
      if (!this.authToken || !this.projectId) {
        return { success: false, error: 'Missing auth or project ID' };
      }

      const response = await this.api.post(
        `/api/projects/${this.projectId}/generate`,
        {},
        {
          headers: { Authorization: `Bearer ${this.authToken}` },
        }
      );

      if (response.status !== 202) {
        return { success: false, error: `Expected 202, got ${response.status}` };
      }

      if (!response.data.jobId) {
        return { success: false, error: 'No job ID in response' };
      }

      return { success: true, details: `Job ID: ${response.data.jobId}` };
    });
    tests.push(startGenResult);

    // Test 3.2: Poll Generation Status (multiple times)
    const pollResult = await this.runTest('Poll Generation Status', async () => {
      if (!this.authToken || !this.projectId) {
        return { success: false, error: 'Missing auth or project ID' };
      }

      let attempts = 0;
      let completed = false;
      let details = '';

      // Poll for up to 30 seconds
      while (attempts < 15 && !completed) {
        const response = await this.api.get(`/api/projects/${this.projectId}/generation-status`, {
          headers: { Authorization: `Bearer ${this.authToken}` },
        });

        if (response.status !== 200) {
          return { success: false, error: `Expected 200, got ${response.status}` };
        }

        const status = response.data.status;
        details = `Attempt ${attempts + 1}: ${status} (${response.data.percentage}%)`;

        if (status === 'completed' || status === 'failed') {
          completed = true;
          details += ` - ${response.data.message}`;
        }

        attempts++;

        if (!completed) {
          // Wait 2 seconds before polling again
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (!completed && attempts >= 15) {
        return { success: false, error: 'Generation timeout (> 30 seconds)' };
      }

      return { success: true, details };
    });
    tests.push(pollResult);

    const duration = Date.now() - startTime;
    return {
      name: 'Code Generation',
      tests,
      passed: tests.filter((t) => t.status === 'PASS').length,
      failed: tests.filter((t) => t.status === 'FAIL').length,
      total: tests.length,
      duration,
    };
  }

  /**
   * TEST SUITE 4: Download & Access Tests
   */
  async testDownloads(): Promise<TestSuite> {
    console.log('\n📋 TEST SUITE 4: Downloads & Access\n');
    const startTime = Date.now();
    const tests: TestResult[] = [];

    // Test 4.1: Get Code Info
    const codeInfoResult = await this.runTest('Get Code Info', async () => {
      if (!this.authToken || !this.projectId) {
        return { success: false, error: 'Missing auth or project ID' };
      }

      // First, check project status to debug
      const projectCheck = await this.api.get(`/api/projects/${this.projectId}`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
      });

      if (projectCheck.status === 200) {
        const projectData = projectCheck.data.project as any;
        const projectStatus = projectData?.status;
        const generatedPath = projectData?.generatedCodePath;
        const orgId = projectData?.organizationId;
        console.log(`    Debug: Project status=${projectStatus}, generatedCodePath=${generatedPath}, orgId=${orgId}`);
        console.log(`    Debug: User ID=${this.userId}`);
      }

      const response = await this.api.get(`/api/projects/${this.projectId}/code-info`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
      });

      if (response.status !== 200) {
        return { success: false, error: `Expected 200, got ${response.status}`, details: JSON.stringify(response.data).substring(0, 100) };
      }

      const fileCount = response.data.fileCount || 0;
      const totalSize = response.data.totalSize || 0;
      return { success: true, details: `${fileCount} files, ${(totalSize / 1024).toFixed(2)}KB` };
    });
    tests.push(codeInfoResult);

    // Test 4.2: Download Code (ZIP)
    const downloadResult = await this.runTest('Download Generated Code', async () => {
      if (!this.authToken || !this.projectId) {
        return { success: false, error: 'Missing auth or project ID' };
      }

      const response = await this.api.get(`/api/projects/${this.projectId}/code`, {
        headers: { Authorization: `Bearer ${this.authToken}` },
        responseType: 'arraybuffer',
      });

      if (response.status !== 200) {
        const errorData = response.data?.toString?.('utf-8') || JSON.stringify(response.data);
        return { success: false, error: `Expected 200, got ${response.status}`, details: errorData.substring(0, 200) };
      }

      const size = response.data.length || 0;
      const contentType = response.headers['content-type'];

      if (contentType !== 'application/zip') {
        return { success: false, error: `Expected zip, got ${contentType}` };
      }

      return { success: true, details: `ZIP file: ${(size / 1024).toFixed(2)}KB` };
    });
    tests.push(downloadResult);

    const duration = Date.now() - startTime;
    return {
      name: 'Downloads & Access',
      tests,
      passed: tests.filter((t) => t.status === 'PASS').length,
      failed: tests.filter((t) => t.status === 'FAIL').length,
      total: tests.length,
      duration,
    };
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 END-TO-END TEST SUITE');
    console.log('='.repeat(60));

    const suites: TestSuite[] = [];
    const overallStart = Date.now();

    try {
      suites.push(await this.testAuthentication());
      suites.push(await this.testProjectManagement());
      suites.push(await this.testCodeGeneration());
      suites.push(await this.testDownloads());
    } catch (error) {
      console.error('\n❌ Test suite error:', error);
    }

    const overallDuration = Date.now() - overallStart;

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60) + '\n');

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    for (const suite of suites) {
      const passRate =
        suite.total > 0 ? ((suite.passed / suite.total) * 100).toFixed(1) : '0';
      console.log(
        `${suite.name.padEnd(25)} ${suite.passed}/${suite.total} passed (${passRate}%) - ${suite.duration}ms`
      );

      totalTests += suite.total;
      totalPassed += suite.passed;
      totalFailed += suite.failed;
    }

    console.log('\n' + '-'.repeat(60));
    const overallPassRate =
      totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0';
    console.log(
      `TOTAL: ${totalPassed}/${totalTests} tests passed (${overallPassRate}%)`
    );
    console.log(`Duration: ${overallDuration}ms\n`);

    if (totalFailed > 0) {
      console.log(`⚠️  ${totalFailed} test(s) failed\n`);
      process.exit(1);
    } else {
      console.log('✅ All tests passed!\n');
      process.exit(0);
    }
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new E2ETestRunner();
  runner.runAllTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { E2ETestRunner };
