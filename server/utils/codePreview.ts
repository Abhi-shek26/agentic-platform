/**
 * Code Preview & Info Handler
 * Provides information about generated code and file listings
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FileInfo {
  name: string;
  type: 'file' | 'directory';
  size: number;
  path: string;
}

export interface CodePreviewInfo {
  projectId: string;
  projectName: string;
  status: string;
  generatedAt: string;
  files: FileInfo[];
  totalSize: number;
  fileCount: number;
}

export class CodePreview {
  /**
   * Get code preview information
   */
  static getCodeInfo(projectPath: string, projectName: string, projectId: string): CodePreviewInfo {
    try {
      const files: FileInfo[] = [];
      let totalSize = 0;
      let fileCount = 0;

      const walkDir = (dir: string, prefix: string = '') => {
        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stat = fs.statSync(fullPath);
          const relativePath = prefix ? `${prefix}/${entry}` : entry;

          if (stat.isDirectory()) {
            files.push({
              name: entry,
              type: 'directory',
              size: 0,
              path: relativePath,
            });
            walkDir(fullPath, relativePath);
          } else {
            files.push({
              name: entry,
              type: 'file',
              size: stat.size,
              path: relativePath,
            });
            totalSize += stat.size;
            fileCount++;
          }
        }
      };

      if (fs.existsSync(projectPath)) {
        walkDir(projectPath);
      }

      return {
        projectId,
        projectName,
        status: 'generated',
        generatedAt: new Date().toISOString(),
        files: files.slice(0, 100), // Limit preview to first 100 entries
        totalSize,
        fileCount,
      };
    } catch (error) {
      console.error('Error getting code info:', error);
      return {
        projectId,
        projectName,
        status: 'error',
        generatedAt: new Date().toISOString(),
        files: [],
        totalSize: 0,
        fileCount: 0,
      };
    }
  }

  /**
   * Get file content preview
   */
  static getFilePreview(
    projectPath: string,
    filePath: string,
    maxLines: number = 50
  ): { content: string; totalLines: number; truncated: boolean } {
    try {
      const fullPath = path.join(projectPath, filePath);

      // Security check - ensure file is within project path
      const realPath = path.resolve(fullPath);
      const realProjectPath = path.resolve(projectPath);

      if (!realPath.startsWith(realProjectPath)) {
        return {
          content: 'Access denied',
          totalLines: 0,
          truncated: true,
        };
      }

      if (!fs.existsSync(fullPath)) {
        return {
          content: 'File not found',
          totalLines: 0,
          truncated: false,
        };
      }

      const stat = fs.statSync(fullPath);

      // Don't preview binary files or very large files
      if (stat.isDirectory() || stat.size > 500000) {
        return {
          content: 'File too large or directory',
          totalLines: 0,
          truncated: true,
        };
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const totalLines = lines.length;
      const preview = lines.slice(0, maxLines).join('\n');
      const truncated = lines.length > maxLines;

      return {
        content: preview,
        totalLines,
        truncated,
      };
    } catch (error) {
      return {
        content: `Error reading file: ${error}`,
        totalLines: 0,
        truncated: true,
      };
    }
  }

  /**
   * Get statistics about generated code
   */
  static getCodeStats(projectPath: string): {
    languages: Record<string, number>;
    totalFiles: number;
    totalLines: number;
  } {
    try {
      const languages: Record<string, number> = {};
      let totalFiles = 0;
      let totalLines = 0;

      const analyzeDir = (dir: string) => {
        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            analyzeDir(fullPath);
          } else {
            totalFiles++;

            // Get file extension
            const ext = path.extname(entry).toLowerCase();
            const lang = ext || 'other';

            languages[lang] = (languages[lang] || 0) + 1;

            // Count lines for text files
            if (['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css'].includes(ext)) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                totalLines += content.split('\n').length;
              } catch (err) {
                // Skip if can't read
              }
            }
          }
        }
      };

      if (fs.existsSync(projectPath)) {
        analyzeDir(projectPath);
      }

      return {
        languages,
        totalFiles,
        totalLines,
      };
    } catch (error) {
      console.error('Error analyzing code:', error);
      return {
        languages: {},
        totalFiles: 0,
        totalLines: 0,
      };
    }
  }
}
