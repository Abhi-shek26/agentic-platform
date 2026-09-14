/**
 * Vercel one-click deploy
 * Uploads the generated project as a static deployment via Vercel REST API.
 * Requires a Vercel token (env VERCEL_TOKEN or per-request). Free tier works.
 */

import * as fs from "fs";
import * as path from "path";

const MAX_FILES = 200;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".next"]);

interface VercelResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  error?: string;
}

function collectFiles(root: string): Array<{ file: string; data: string }> {
  const out: Array<{ file: string; data: string }> = [];
  let total = 0;

  const walk = (dir: string, rel: string) => {
    if (out.length >= MAX_FILES || total >= MAX_TOTAL_BYTES) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (out.length >= MAX_FILES || total >= MAX_TOTAL_BYTES) return;
      if (entry.name.startsWith("." ) && entry.name !== ".well-known") {
        if (entry.name !== ".well-known") continue;
      }
      const abs = path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(abs, relPath);
      } else if (entry.isFile()) {
        const buf = fs.readFileSync(abs);
        if (total + buf.length > MAX_TOTAL_BYTES) continue;
        total += buf.length;
        out.push({ file: relPath, data: buf.toString("utf-8") });
      }
    }
  };

  walk(root, "");
  return out;
}

export async function deployToVercel(
  projectPath: string,
  projectName: string,
  token: string
): Promise<VercelResult> {
  try {
    if (!fs.existsSync(projectPath)) {
      return { success: false, error: "Generated project not found on disk" };
    }

    // Deploy the REAL built app (dist/client from the honest-preview build),
    // not raw sources: with framework:null Vercel serves files statically,
    // so sources would just be dead weight against the file/size caps.
    // Falls back to the static placeholder only when no build exists.
    const distDir = path.join(projectPath, "dist", "client");
    const distIndex = path.join(distDir, "index.html");
    let files: Array<{ file: string; data: string }>;
    if (fs.existsSync(distIndex)) {
      files = collectFiles(distDir);
    } else {
      const previewIndex = path.join(projectPath, "preview", "index.html");
      if (!fs.existsSync(previewIndex)) {
        return { success: false, error: "No built app or preview to deploy (open the preview once to build)" };
      }
      files = [
        {
          file: "index.html",
          data: fs.readFileSync(previewIndex, "utf-8"),
        },
      ];
    }
    if (files.length === 0) {
      return { success: false, error: "No files to deploy" };
    }

    const name = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 60) || "tournament-site";

    const res = await fetch("https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        files,
        projectSettings: { framework: null },
        target: "production",
      }),
    });

    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body?.error?.message || `Vercel API error ${res.status}`;
      return { success: false, error: msg };
    }

    const url = body?.url ? `https://${body.url}` : undefined;
    return { success: true, url, deploymentId: body?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
