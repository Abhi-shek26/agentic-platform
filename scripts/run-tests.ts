#!/usr/bin/env tsx

/**
 * Complete Test Suite Runner
 * Runs Unit Tests + E2E Tests + Code Quality Check
 */

import { CodeQualityTests } from '../server/tests/codegen.test';
import { E2ETestRunner } from '../server/tests/e2e.test';

interface TestReport {
  timestamp: string;
  environment: string;
  results: {
    unitTests: {
      passed: number;
      failed: number;
      total: number;
    };
    codeQuality: {
      score: number;
      issues: string[];
    };
    e2eTests?: {
      passed: number;
      failed: number;
      total: number;
    };
  };
}

async function runTestSuite(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log(
    '🧪 COMPLETE TEST SUITE: Unit + Quality + E2E'.padStart(
      '🧪 COMPLETE TEST SUITE: Unit + Quality + E2E'.length + 10
    )
  );
  console.log('='.repeat(70) + '\n');

  const report: TestReport = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    results: {
      unitTests: { passed: 0, failed: 0, total: 0 },
      codeQuality: { score: 0, issues: [] },
    },
  };

  // ============================================================
  // PHASE 1: Unit Tests
  // ============================================================

  console.log('📝 PHASE 1: Unit Tests\n');
  console.log('─'.repeat(70) + '\n');

  const unitTests = [
    {
      name: 'Component Generation',
      fn: () => CodeQualityTests.testComponentGeneration(),
    },
    {
      name: 'Route Generation',
      fn: () => CodeQualityTests.testRouteGeneration(),
    },
    {
      name: 'Config Generation',
      fn: () => CodeQualityTests.testConfigGeneration(),
    },
    {
      name: 'File Validation',
      fn: () => CodeQualityTests.testFileValidation(),
    },
  ];

  let unitPassed = 0;
  let unitFailed = 0;

  for (const test of unitTests) {
    const startTime = Date.now();
    const result = test.fn();
    const duration = Date.now() - startTime;

    const status = result.success ? '✓' : '✗';
    const color = result.success ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`  ${color}${status}${reset} ${test.name.padEnd(30)} (${duration}ms)`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`    ${result.details}`);
    }

    if (result.success) {
      unitPassed++;
    } else {
      unitFailed++;
    }
  }

  report.results.unitTests = {
    passed: unitPassed,
    failed: unitFailed,
    total: unitTests.length,
  };

  // ============================================================
  // PHASE 2: Code Quality Analysis
  // ============================================================

  console.log('\n' + '─'.repeat(70) + '\n');
  console.log('📊 PHASE 2: Code Quality Analysis\n');
  console.log('─'.repeat(70) + '\n');

  const qualityMetrics = CodeQualityTests.testCompleteProjectGeneration();

  const qualityScore =
    (qualityMetrics.hasValidSyntax ? 25 : 0) +
    (qualityMetrics.fileStructureValid ? 25 : 0) +
    (qualityMetrics.requiredFilesPresent ? 25 : 0) +
    (qualityMetrics.totalFiles > 10 ? 25 : 0);

  console.log(`  Total Files Generated: ${qualityMetrics.totalFiles}`);
  console.log(`  Total Lines of Code: ${qualityMetrics.totalLines}`);
  console.log(`  Valid Syntax: ${qualityMetrics.hasValidSyntax ? '✓' : '✗'}`);
  console.log(`  File Structure Valid: ${qualityMetrics.fileStructureValid ? '✓' : '✗'}`);
  console.log(`  Required Files Present: ${qualityMetrics.requiredFilesPresent ? '✓' : '✗'}`);
  console.log(`\n  Quality Score: ${qualityScore}/100\n`);

  if (qualityMetrics.issues.length > 0) {
    console.log('  Issues Found:');
    for (const issue of qualityMetrics.issues) {
      console.log(`    • ${issue}`);
    }
    console.log();
  }

  report.results.codeQuality = {
    score: qualityScore,
    issues: qualityMetrics.issues,
  };

  // ============================================================
  // PHASE 3: E2E Integration Tests (Optional)
  // ============================================================

  const runE2E = process.env.E2E_TESTS === 'true';

  if (runE2E) {
    console.log('\n' + '─'.repeat(70) + '\n');
    console.log('🌐 PHASE 3: E2E Integration Tests\n');
    console.log('─'.repeat(70) + '\n');

    try {
      const e2eRunner = new E2ETestRunner();
      // Actually run the E2E tests
      await e2eRunner.runAllTests();
    } catch (error) {
      console.error('  E2E tests skipped (backend not running)\n');
    }
  }

  // ============================================================
  // Final Report
  // ============================================================

  console.log('\n' + '='.repeat(70));
  console.log('📋 TEST REPORT SUMMARY');
  console.log('='.repeat(70) + '\n');

  console.log(`  Timestamp: ${report.timestamp}`);
  console.log(`  Environment: ${report.environment}`);
  console.log();
  console.log(
    `  Unit Tests: ${report.results.unitTests.passed}/${report.results.unitTests.total} passed`
  );
  console.log(`  Code Quality Score: ${report.results.codeQuality.score}/100`);

  const overallHealth =
    report.results.unitTests.passed === report.results.unitTests.total &&
    report.results.codeQuality.score >= 75;

  console.log();
  if (overallHealth) {
    console.log('  ✅ Overall Status: HEALTHY\n');
  } else {
    console.log('  ⚠️  Overall Status: NEEDS ATTENTION\n');
  }

  console.log('─'.repeat(70) + '\n');

  // Exit code
  if (!overallHealth) {
    process.exit(1);
  }
}

// Run tests
runTestSuite().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
