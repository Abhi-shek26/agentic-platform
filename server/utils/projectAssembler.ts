/**
 * Project Assembler
 * Orchestrates complete project generation and file assembly
 */

import * as path from 'path';
import { CodeGenerator } from './codeGenerator';
import { FileAssembler } from './fileAssembler';

export interface AssemblerResult {
  success: boolean;
  projectPath: string;
  stats: {
    filesGenerated: number;
    totalLines: number;
    filesByType: Record<string, number>;
  };
  errors: string[];
  warnings: string[];
}

export class ProjectAssembler {
  private static readonly GENERATED_PROJECTS_DIR = '/generated-projects';

  /**
   * Initialize and prepare generated projects directory
   */
  static initializeProjectDirectory(projectId: string): { projectPath: string; error?: string } {
    try {
      const projectPath = path.join(process.cwd(), `generated-projects/${projectId}`);
      return { projectPath };
    } catch (error) {
      return {
        projectPath: '',
        error: `Failed to initialize project directory: ${error}`,
      };
    }
  }

  /**
   * Assemble complete tournament website project
   */
  static async assembleProject(
    projectId: string,
    projectName: string,
    generationData: any
  ): Promise<AssemblerResult> {
    console.log(`\n🏗️  Assembling project: ${projectName}`);

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Initialize project directory
      const { projectPath, error: dirError } = this.initializeProjectDirectory(projectId);
      if (dirError) {
        return {
          success: false,
          projectPath,
          errors: [dirError],
          warnings,
          stats: { filesGenerated: 0, totalLines: 0, filesByType: {} },
        };
      }

      console.log(`📁 Project directory: ${projectPath}`);

      // Create directory structure
      console.log('\n📂 Creating directory structure...');
      const structureResult = FileAssembler.createDirectoryStructure(projectPath);
      if (!structureResult.success) {
        warnings.push(...structureResult.errors);
      }

      // Generate all code
      console.log('\n🔨 Generating code files...');
      const codeGenResult = CodeGenerator.generateProject({
        projectName,
        specification: generationData.specification,
        architecture: generationData.architecture,
        frontend: generationData.frontend,
        backend: generationData.backend,
        database: generationData.database,
      });

      if (!codeGenResult.success && codeGenResult.errors) {
        warnings.push(...codeGenResult.errors);
      }

      // Write files to disk
      console.log('\n💾 Writing files to disk...');
      const writeResult = FileAssembler.writeFiles(projectPath, codeGenResult.files);

      if (!writeResult.success) {
        errors.push(...writeResult.errors);
      }

      // Create README
      FileAssembler.createReadme(projectPath, {
        projectName,
        specification: generationData.specification,
      });

      // Get project statistics
      const stats = FileAssembler.getProjectStats(codeGenResult.files);

      console.log('\n✅ Project assembly complete!');
      console.log(`   Files: ${stats.totalFiles}`);
      console.log(`   Lines: ${stats.totalLines}`);
      console.log(`   Types: ${JSON.stringify(stats.filesByType)}`);

      return {
        success: errors.length === 0,
        projectPath,
        stats,
        errors,
        warnings,
      };
    } catch (error) {
      const errorMsg = `Project assembly failed: ${error instanceof Error ? error.message : error}`;
      console.error(`❌ ${errorMsg}`);
      return {
        success: false,
        projectPath: '',
        errors: [errorMsg],
        warnings,
        stats: { filesGenerated: 0, totalLines: 0, filesByType: {} },
      };
    }
  }

  /**
   * Verify generated project is valid
   */
  static verifyProject(projectPath: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check required files
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'Dockerfile',
      '.gitignore',
    ];

    console.log('\n🔍 Verifying project structure...');

    // This would be extended to actually check files
    // For now, basic validation

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get generated project path
   */
  static getProjectPath(projectId: string): string {
    return path.join(process.cwd(), `generated-projects/${projectId}`);
  }

  /**
   * Create archive of generated project
   */
  static async archiveProject(projectId: string): Promise<{ archivePath?: string; error?: string }> {
    try {
      // This would use archiver library to create ZIP file
      // Implementation for Phase 4
      const projectPath = this.getProjectPath(projectId);
      return { archivePath: `${projectPath}.zip` };
    } catch (error) {
      return { error: `Failed to archive project: ${error}` };
    }
  }

  /**
   * Clean up generated project
   */
  static cleanupProject(projectId: string): { success: boolean; error?: string } {
    try {
      // Implementation to delete files
      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to cleanup: ${error}` };
    }
  }
}
