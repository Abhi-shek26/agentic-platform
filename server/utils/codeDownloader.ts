/**
 * Code Download & Archive Handler
 * Handles downloading generated projects as ZIP files
 */

import archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export class CodeDownloader {
  /**
   * Create ZIP archive of generated project
   */
  static async createProjectArchive(
    projectPath: string,
    projectId: string,
    projectName: string
  ): Promise<DownloadResult> {
    try {
      // Verify project directory exists
      if (!fs.existsSync(projectPath)) {
        return {
          success: false,
          error: `Project directory not found: ${projectPath}`,
        };
      }

      // Create temp directory for archives
      const tempDir = path.join(process.cwd(), '.tmp-downloads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const sanitizedName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const archivePath = path.join(tempDir, `${sanitizedName}-${projectId}.zip`);

      return new Promise((resolve) => {
        try {
          const output = fs.createWriteStream(archivePath);
          const archive = archiver('zip', { zlib: { level: 9 } });

          output.on('close', () => {
            console.log(`✓ Archive created: ${archivePath} (${archive.pointer()} bytes)`);
            resolve({
              success: true,
              filePath: archivePath,
            });
          });

          archive.on('error', (err) => {
            console.error('Archive error:', err);
            resolve({
              success: false,
              error: `Failed to create archive: ${err.message}`,
            });
          });

          archive.pipe(output);

          // Add all files from project directory
          archive.directory(projectPath + '/', false);

          archive.finalize();
        } catch (error) {
          resolve({
            success: false,
            error: `Archive creation failed: ${error}`,
          });
        }
      });
    } catch (error) {
      return {
        success: false,
        error: `Error creating archive: ${error}`,
      };
    }
  }

  /**
   * Send file as download response
   */
  static async sendFileDownload(
    filePath: string,
    projectName: string,
    res: Response
  ): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const sanitizedName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      const fileName = `${sanitizedName}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('end', () => {
        // Clean up temp file after sending
        setTimeout(() => {
          try {
            fs.unlinkSync(filePath);
            console.log(`✓ Cleaned up: ${filePath}`);
          } catch (err) {
            console.error('Cleanup error:', err);
          }
        }, 1000);
      });

      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download file' });
        }
      });
    } catch (error) {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    }
  }

  /**
   * Clean up old temporary files
   */
  static cleanupOldFiles(maxAgeMs: number = 3600000): void {
    try {
      const tempDir = path.join(process.cwd(), '.tmp-downloads');

      if (!fs.existsSync(tempDir)) {
        return;
      }

      const files = fs.readdirSync(tempDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stat = fs.statSync(filePath);
        const fileAge = now - stat.mtimeMs;

        if (fileAge > maxAgeMs) {
          try {
            fs.unlinkSync(filePath);
            console.log(`✓ Cleaned up old file: ${file}`);
          } catch (err) {
            console.error(`Failed to clean up ${file}:`, err);
          }
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Get project download info
   */
  static getDownloadInfo(projectId: string, projectName: string): { fileName: string; size: string } {
    const sanitizedName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

    return {
      fileName: `${sanitizedName}-${projectId}.zip`,
      size: 'Calculating...',
    };
  }
}
