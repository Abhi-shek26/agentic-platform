/**
 * Unit Tests for Code Generation
 * Validates generated code quality and structure
 */

import { CodeGenerator } from '../codegen/generators/codeGenerator';
import { FileAssembler } from '../codegen/generators/fileAssembler';

interface CodeQualityMetrics {
  hasValidSyntax: boolean;
  fileStructureValid: boolean;
  requiredFilesPresent: boolean;
  missingFiles: string[];
  totalFiles: number;
  totalLines: number;
  issues: string[];
}

export class CodeQualityTests {
  /**
   * Test component generation
   */
  static testComponentGeneration(): { success: boolean; error?: string; details?: string } {
    try {
      const result = CodeGenerator.generateComponents({
        components: [
          {
            name: 'TestComponent',
            props: [{ name: 'title', type: 'string', optional: false }],
            imports: '',
            jsx: '<div>{title}</div>',
          },
        ],
      });

      if (!result.success) {
        return { success: false, error: 'Component generation failed', details: result.errors?.[0] };
      }

      if (result.files.length === 0) {
        return { success: false, error: 'No files generated' };
      }

      const content = result.files[0].content;
      if (!content.includes('TestComponent') || !content.includes('React.FC')) {
        return { success: false, error: 'Generated content missing expected patterns' };
      }

      return { success: true, details: `Generated ${result.files.length} component file(s)` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test route generation
   */
  static testRouteGeneration(): { success: boolean; error?: string; details?: string } {
    try {
      const result = CodeGenerator.generateRoutes({
        routes: [
          {
            method: 'GET',
            path: '/api/test',
            name: 'Test route',
            logic: 'const data = { message: "test" };',
            response: '{ data }',
          },
        ],
      });

      if (!result.success) {
        return { success: false, error: 'Route generation failed' };
      }

      if (result.files.length === 0) {
        return { success: false, error: 'No files generated' };
      }

      const content = result.files[0].content;
      if (!content.includes("router.get") && !content.includes("'/api/test'")) {
        return { success: false, error: 'Generated route missing expected patterns' };
      }

      return { success: true, details: `Generated ${result.files.length} route file(s)` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test config generation
   */
  static testConfigGeneration(): { success: boolean; error?: string; details?: string } {
    try {
      const result = CodeGenerator.generateConfigs({ projectName: 'test-project' });

      if (!result.success) {
        return { success: false, error: 'Config generation failed' };
      }

      const requiredFiles = ['package.json', 'tsconfig.json', 'vite.config.ts', '.gitignore'];
      const generatedFiles = result.files.map((f) => f.path);

      const missing = requiredFiles.filter((file) => !generatedFiles.some((g) => g.includes(file)));

      if (missing.length > 0) {
        return { success: false, error: `Missing files: ${missing.join(', ')}` };
      }

      return { success: true, details: `Generated ${result.files.length} config file(s)` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test file validation
   */
  static testFileValidation(): { success: boolean; error?: string; details?: string } {
    try {
      // Test TypeScript validation
      const validTS = 'function test() { return "hello"; }';
      const validation1 = FileAssembler.validateTypeScript(validTS);

      if (!validation1.valid) {
        return { success: false, error: 'Valid TS marked as invalid' };
      }

      // Test invalid TS (unbalanced braces)
      const invalidTS = 'function test() { return "hello"; }}}';
      const validation2 = FileAssembler.validateTypeScript(invalidTS);

      if (validation2.valid) {
        return { success: false, error: 'Invalid TS marked as valid' };
      }

      return { success: true, details: 'TypeScript validation working correctly' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Test complete project generation
   */
  static testCompleteProjectGeneration(): CodeQualityMetrics {
    const metrics: CodeQualityMetrics = {
      hasValidSyntax: false,
      fileStructureValid: false,
      requiredFilesPresent: false,
      missingFiles: [],
      totalFiles: 0,
      totalLines: 0,
      issues: [],
    };

    try {
      const data = {
        projectName: 'Quality Test',
        specification: {
          tournamentName: 'Test',
          date: '2026-06-15',
          location: 'Test',
        },
        architecture: {},
        frontend: {
          components: [
            {
              name: 'Hero',
              props: [],
              imports: '',
              jsx: '<div>Hero</div>',
            },
          ],
          pages: [
            {
              name: 'Home',
              path: '/',
              components: ['Hero'],
              hooks: [],
            },
          ],
        },
        backend: {
          routes: [
            {
              method: 'GET',
              path: '/api/health',
              name: 'Health check',
              logic: 'const status = "ok";',
              response: '{ status }',
            },
          ],
        },
        database: {
          tables: [
            {
              name: 'tournaments',
              fields: [
                { fieldName: 'id', type: 'uuid', constraints: { primaryKey: true } },
                { fieldName: 'name', type: 'string', constraints: { notNull: true } },
              ],
            },
          ],
        },
      };

      const result = CodeGenerator.generateProject(data);

      metrics.totalFiles = result.files.length;

      if (result.files.length < 10) {
        metrics.issues.push(`Low file count: ${result.files.length} (expected >= 10)`);
      }

      const fileTypes: Record<string, number> = {};
      let totalLines = 0;

      for (const file of result.files) {
        fileTypes[file.type] = (fileTypes[file.type] || 0) + 1;
        totalLines += file.content.split('\n').length;

        // Validate syntax for code files
        if (file.type === 'typescript' && result.success) {
          const validation = FileAssembler.validateTypeScript(file.content);
          if (!validation.valid) {
            metrics.issues.push(`Syntax error in ${file.path}: ${validation.errors[0]}`);
          }
        }
      }

      metrics.totalLines = totalLines;
      metrics.hasValidSyntax = metrics.issues.length === 0;

      // Check required file types
      const requiredTypes = ['typescript', 'json'];
      const missingTypes = requiredTypes.filter((type) => !fileTypes[type]);

      if (missingTypes.length === 0) {
        metrics.requiredFilesPresent = true;
      } else {
        metrics.missingFiles = missingTypes;
        metrics.issues.push(`Missing file types: ${missingTypes.join(', ')}`);
      }

      metrics.fileStructureValid = result.files.some((f) => f.path.includes('client/')) &&
        result.files.some((f) => f.path.includes('server/')) &&
        result.files.some((f) => f.path.includes('package.json'));

      if (!metrics.fileStructureValid) {
        metrics.issues.push('Missing required directory structure');
      }
    } catch (error) {
      metrics.issues.push(`Exception: ${error}`);
    }

    return metrics;
  }
}
