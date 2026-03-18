/**
 * File Assembler
 * Writes generated files to disk and creates project structure
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FileToWrite {
  path: string;
  content: string;
  type: 'typescript' | 'json' | 'plaintext' | 'yaml';
}

export class FileAssembler {
  /**
   * Create directory structure recursively
   */
  private static ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Write files to disk
   */
  static writeFiles(projectPath: string, files: FileToWrite[]): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    console.log(`📁 Creating project directory: ${projectPath}`);

    try {
      // Create project root directory
      if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
      }

      // Write each file
      for (const file of files) {
        try {
          const fullPath = path.join(projectPath, file.path);
          this.ensureDirectoryExists(fullPath);

          fs.writeFileSync(fullPath, file.content, 'utf-8');
          console.log(`✓ ${file.path}`);
        } catch (error) {
          const errorMsg = `Failed to write ${file.path}: ${error instanceof Error ? error.message : error}`;
          errors.push(errorMsg);
          console.error(`✗ ${errorMsg}`);
        }
      }

      return {
        success: errors.length === 0,
        errors,
      };
    } catch (error) {
      const errorMsg = `File assembly failed: ${error instanceof Error ? error.message : error}`;
      errors.push(errorMsg);
      return { success: false, errors };
    }
  }

  /**
   * Create standard directory structure
   */
  static createDirectoryStructure(projectPath: string): { success: boolean; errors: string[] } {
    const errors: string[] = [];
    const directories = [
      'client/src/pages',
      'client/src/components',
      'client/src/hooks',
      'client/src/lib',
      'client/public',
      'server/routes',
      'server/middleware',
      'server/controllers',
      'server/services',
      'server/utils',
      'server/db',
      'shared/types',
      'shared/constants',
      'shared/schemas',
    ];

    for (const dir of directories) {
      try {
        const fullPath = path.join(projectPath, dir);
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✓ Created directory: ${dir}`);
      } catch (error) {
        const errorMsg = `Failed to create directory ${dir}: ${error}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  /**
   * Create README file
   */
  static createReadme(projectPath: string, projectData: any): void {
    const readmeContent = `# ${projectData.projectName}

${projectData.specification?.description || 'Generated tournament website'}

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL
- npm or yarn

### Installation

\`\`\`bash
npm install
\`\`\`

### Environment Setup

1. Copy \`.env.example\` to \`.env\`
2. Update database credentials
3. Configure any API keys

### Development

\`\`\`bash
npm run dev
\`\`\`

Server runs on http://localhost:5000
Frontend runs on http://localhost:5173

### Database

\`\`\`bash
npm run db:push     # Apply migrations
npm run db:studio   # Open Drizzle Studio
\`\`\`

### Build

\`\`\`bash
npm run build
npm start
\`\`\`

## Project Structure

\`\`\`
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   ├── hooks/      # Custom hooks
│   │   └── lib/        # Utilities and API calls
│   └── public/         # Static files
├── server/             # Express backend
│   ├── routes/         # API routes
│   ├── middleware/     # Express middleware
│   ├── db/             # Database schemas
│   └── utils/          # Utilities
├── shared/             # Shared types and constants
└── config files        # vite.config.ts, tailwind.config.ts, etc.
\`\`\`

Generated with Agentic Platform ✨
`;

    try {
      fs.writeFileSync(path.join(projectPath, 'README.md'), readmeContent, 'utf-8');
      console.log('✓ Created README.md');
    } catch (error) {
      console.error('Failed to create README:', error);
    }
  }

  /**
   * Validate TypeScript syntax (basic check)
   */
  static validateTypeScript(content: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation checks
    const checks = [
      {
        name: 'Balanced braces',
        test: (c: string) => (c.match(/{/g) || []).length === (c.match(/}/g) || []).length,
      },
      {
        name: 'Balanced parentheses',
        test: (c: string) => (c.match(/\(/g) || []).length === (c.match(/\)/g) || []).length,
      },
      {
        name: 'Balanced brackets',
        test: (c: string) => (c.match(/\[/g) || []).length === (c.match(/\]/g) || []).length,
      },
      {
        name: 'Strings closed',
        test: (c: string) => {
          const singleQuotes = (c.match(/'/g) || []).length;
          const doubleQuotes = (c.match(/"/g) || []).length;
          const backTicks = (c.match(/`/g) || []).length;
          return singleQuotes % 2 === 0 && doubleQuotes % 2 === 0 && backTicks % 2 === 0;
        },
      },
    ];

    for (const check of checks) {
      if (!check.test(content)) {
        errors.push(`Syntax error: ${check.name}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get project summary statistics
   */
  static getProjectStats(files: FileToWrite[]): {
    totalFiles: number;
    filesByType: Record<string, number>;
    totalLines: number;
  } {
    const filesByType: Record<string, number> = {};
    let totalLines = 0;

    for (const file of files) {
      filesByType[file.type] = (filesByType[file.type] || 0) + 1;
      totalLines += file.content.split('\n').length;
    }

    return {
      totalFiles: files.length,
      filesByType,
      totalLines,
    };
  }
}
