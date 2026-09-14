import { execFile } from "child_process";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

/**
 * Honest per-project preview builder.
 *
 * /sites/:id used to serve a static placeholder (project name + "download the
 * ZIP" cards) that told you nothing about the generated code. This module
 * builds the actual generated project (npm install + vite build with a
 * per-project --base) on first request and serves the real app afterwards.
 *
 * - Builds are cached: once dist/client exists, requests are pure static.
 * - Concurrent requests for the same project share one in-flight build.
 * - Build failures fall back to the static placeholder (never a hang).
 */

export type BuildState =
  | { status: "ready"; distDir: string }
  | { status: "building" }
  | { status: "failed"; error: string }
  | { status: "missing" };

const inflight = new Map<string, Promise<BuildState>>();

function projectDir(projectId: string): string {
  return path.resolve(process.cwd(), "generated-projects", projectId);
}

function run(cmd: string, args: string[], cwd: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const tail = `${stdout}\n${stderr}`.slice(-2000);
        reject(new Error(`${cmd} ${args.join(" ")} failed: ${err.message}\n${tail}`));
      } else {
        resolve();
      }
    });
  });
}

/** Hash of package.json — when unchanged and node_modules exists, skip install. */
function depsHash(dir: string): string | null {
  try {
    const pkg = fs.readFileSync(path.join(dir, "package.json"));
    return createHash("sha256").update(pkg).digest("hex");
  } catch {
    return null;
  }
}

function storedHash(dir: string): string | null {
  try {
    return fs.readFileSync(path.join(dir, ".preview-deps-hash"), "utf8").trim() || null;
  } catch {
    return null;
  }
}

const BUILD_MARKER = ".preview-build-v2";

async function doBuild(projectId: string): Promise<BuildState> {
  const dir = projectDir(projectId);
  const distDir = path.join(dir, "dist", "client");
  const failMarker = path.join(dir, ".preview-build-failed");
  try {
    if (!fs.existsSync(path.join(dir, "package.json")) || !fs.existsSync(path.join(dir, "client"))) {
      return { status: "missing" };
    }
    if (fs.existsSync(path.join(distDir, "index.html"))) {
      // Rebuild once when the bundle predates the portable relative-base
      // builds (old bundles used an absolute /sites/<id>/ base that 404s
      // anywhere else, e.g. Vercel). Marker bump = one-time migration.
      if (fs.existsSync(path.join(dir, BUILD_MARKER))) {
        return { status: "ready", distDir };
      }
      console.log(`[Preview] Stale absolute-base bundle for ${projectId}, rebuilding portable...`);
    }
    // A previous attempt failed and sources haven't changed since — don't
    // burn minutes retrying on every request. Marker is cleared on regenerate
    // (assembly writes fresh sources; see refreshFailureMarker).
    if (fs.existsSync(failMarker)) {
      return { status: "failed", error: fs.readFileSync(failMarker, "utf8").slice(0, 500) };
    }
    console.log(`[Preview] Building project ${projectId} (npm install + vite build)...`);
    const hash = depsHash(dir);
    const nmDir = path.join(dir, "node_modules");
    if (hash && fs.existsSync(nmDir) && storedHash(dir) === hash) {
      console.log(`[Preview] Dependencies unchanged — skipping npm install`);
    } else {
      await run("npm", ["install", "--no-audit", "--no-fund"], dir, 6 * 60 * 1000);
      if (hash) {
        try {
          fs.writeFileSync(path.join(dir, ".preview-deps-hash"), hash);
        } catch {
          /* ignore */
        }
      }
    }
    await run("npx", ["vite", "build", "--base=./"], dir, 8 * 60 * 1000);
    if (!fs.existsSync(path.join(distDir, "index.html"))) {
      throw new Error("vite build finished but dist/client/index.html is missing");
    }
    try {
      fs.writeFileSync(path.join(dir, BUILD_MARKER), new Date().toISOString());
      fs.unlinkSync(failMarker);
    } catch {
      /* ignore */
    }
    console.log(`[Preview] ✓ Project ${projectId} built`);
    return { status: "ready", distDir };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Preview] ✗ Build failed for ${projectId}:`, msg.slice(0, 500));
    try {
      fs.writeFileSync(failMarker, msg.slice(0, 2000));
    } catch {
      /* ignore */
    }
    return { status: "failed", error: msg.slice(0, 500) };
  }
}

/** Clear a stale failure marker (called after fresh assembly writes new sources). */
export function refreshFailureMarker(projectId: string): void {
  try {
    fs.unlinkSync(path.join(projectDir(projectId), ".preview-build-failed"));
  } catch {
    /* none */
  }
  // A fresh assembly also invalidates any previously built bundle.
  try {
    fs.rmSync(path.join(projectDir(projectId), "dist"), { recursive: true, force: true });
  } catch {
    /* none */
  }
}

export function ensureBuilt(projectId: string): Promise<BuildState> {
  const existing = inflight.get(projectId);
  if (existing) return existing;
  const p = doBuild(projectId).finally(() => {
    inflight.delete(projectId);
  });
  inflight.set(projectId, p);
  return p;
}

/** Resolve a static asset inside a built dist dir, guarding traversal. */
export function resolveDistAsset(distDir: string, subPath: string): string | null {
  const file = path.resolve(distDir, subPath);
  if (!file.startsWith(distDir + path.sep) && file !== distDir) return null;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return file;
}

/** Touch the last-access marker so pruning knows this preview is still used. */
export function touchPreviewAccess(projectId: string): void {
  try {
    const dir = projectDir(projectId);
    if (!fs.existsSync(dir)) return;
    fs.writeFileSync(path.join(dir, ".preview-last-access"), new Date().toISOString());
  } catch {
    /* ignore */
  }
}

function dirSizeBytes(dir: string): number {
  let total = 0;
  const walk = (d: string) => {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile()) {
        try {
          total += fs.statSync(full).size;
        } catch {
          /* ignore */
        }
      }
    }
  };
  walk(dir);
  return total;
}

/**
 * Prune stale honest-preview build artifacts (node_modules + dist) for
 * projects untouched for longer than maxAgeDays. Sources are never deleted —
 * the next preview request simply rebuilds. Runs on boot; disabled with
 * PREVIEW_CACHE_DAYS=0. Returns bytes reclaimed (best-effort).
 */
export function prunePreviewCaches(
  maxAgeDays = Number(process.env.PREVIEW_CACHE_DAYS ?? 14),
  root = path.resolve(process.cwd(), "generated-projects")
): number {
  if (!maxAgeDays || maxAgeDays <= 0) return 0;
  if (!fs.existsSync(root)) return 0;
  const cutoff = Date.now() - maxAgeDays * 24 * 3600 * 1000;
  let reclaimed = 0;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(root, entry.name);
    const nmDir = path.join(dir, "node_modules");
    const distDir = path.join(dir, "dist");
    if (!fs.existsSync(nmDir) && !fs.existsSync(distDir)) continue;
    let lastAccess = 0;
    try {
      lastAccess = fs.statSync(path.join(dir, ".preview-last-access")).mtimeMs;
    } catch {
      try {
        lastAccess = fs.statSync(nmDir).mtimeMs;
      } catch {
        continue;
      }
    }
    if (lastAccess > cutoff) continue;
    for (const target of [nmDir, distDir]) {
      if (!fs.existsSync(target)) continue;
      const size = dirSizeBytes(target);
      try {
        fs.rmSync(target, { recursive: true, force: true });
        reclaimed += size;
        console.log(`[Preview] Pruned stale cache: ${entry.name}/${path.basename(target)} (${(size / 1048576).toFixed(1)} MB)`);
      } catch (err) {
        console.error(`[Preview] Prune failed for ${target}:`, err instanceof Error ? err.message : err);
      }
    }
    // Hash no longer matches anything — force a fresh install next time.
    try {
      fs.unlinkSync(path.join(dir, ".preview-deps-hash"));
    } catch {
      /* ignore */
    }
  }
  if (reclaimed > 0) console.log(`[Preview] Reclaimed ${(reclaimed / 1048576).toFixed(1)} MB preview caches`);
  return reclaimed;
}
