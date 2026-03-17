import fs from "fs/promises";
import path from "path";
import { mkdir, writeFile, readFile } from "fs/promises";

/**
 * File system utilities for code generation
 */

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as any).code !== "EEXIST") {
      throw error;
    }
  }
}

export async function writeFileWithDirs(
  filePath: string,
  content: string
): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await writeFile(filePath, content, "utf-8");
}

export async function readFileContent(filePath: string): Promise<string> {
  return readFile(filePath, "utf-8");
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as any).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function deleteDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    if ((error as any).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    return files.map((f) => path.join(dirPath, f.name));
  } catch (error) {
    return [];
  }
}

export async function zipDirectory(
  sourcePath: string,
  zipPath: string
): Promise<void> {
  // TODO: Implement using archiver package
  console.log(`Would zip ${sourcePath} to ${zipPath}`);
}

export function getProjectPath(projectId: string): string {
  return path.join(process.cwd(), "generated-projects", projectId);
}

export function getProjectClientPath(projectId: string): string {
  return path.join(getProjectPath(projectId), "client");
}

export function getProjectServerPath(projectId: string): string {
  return path.join(getProjectPath(projectId), "server");
}

export function getProjectSharedPath(projectId: string): string {
  return path.join(getProjectPath(projectId), "shared");
}
