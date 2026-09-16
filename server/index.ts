import express, { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createServer } from "http";
import apiRoutes from "./routes";
import { errorHandler } from "./utils/errors";
import { generateQueue } from "./queue/jobQueue";
import { ensureDatabase } from "./db";
import { ensureBuilt, resolveDistAsset, touchPreviewAccess, prunePreviewCaches } from "./utils/siteBuilder";
import { storage } from "./storage";
import * as fs from "fs";
import * as path from "path";
import "./utils/passport";

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 5000;
// Render/Vercel sit behind proxies — needed for secure cookies + correct IPs.
app.set("trust proxy", 1);

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS — split deploy: Vercel frontend -> Render backend (Bearer tokens).
// FRONTEND_URL=https://<vercel-app>.vercel.app in prod, else * for local dev.
app.use((req, res, next) => {
  const frontendUrl = (process.env.FRONTEND_URL || "").trim().replace(/\/+$/, "");
  res.header("Access-Control-Allow-Origin", frontendUrl || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (frontendUrl) {
    res.header("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Session management — split deploy uses cross-site cookies (Vercel -> Render),
// so prod needs sameSite:none + secure. Single Render instance, MemoryStore is fine.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-key",
    resave: false,
    saveUninitialized: false,
    proxy: process.env.NODE_ENV === "production",
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.FRONTEND_URL ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Passport authentication
app.use(passport.initialize());
app.use(passport.session());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });
  next();
});

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", apiRoutes);

// ============================================================
// PUBLIC SITE HOSTING — the REAL built app, no auth (like real hosting)
// GET /sites/:projectId builds the generated project on first request
// (cached afterwards) and serves its dist. While building, a status page
// with auto-refresh is returned; on build failure the static placeholder
// is served as fallback. Registered BEFORE static/SPA fallback.
// ============================================================

const BUILDING_PAGE = `<!DOCTYPE html><html><head><meta charset="UTF-8" />
<meta http-equiv="refresh" content="5" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Building preview…</title>
<script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-gray-50 flex items-center justify-center min-h-screen">
<div class="text-center"><div class="text-2xl font-bold text-gray-800">Building your preview…</div>
<p class="text-gray-500 mt-2">First load installs dependencies and bundles the app (1–3 min). This page refreshes automatically.</p></div>
</body></html>`;

app.get("/sites/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      return res.status(400).send("Invalid site id");
    }
    const project = await storage.getProject(id);
    if (!project || !project.generatedCodePath) {
      return res.status(404).send("Site not found");
    }
    if (project.status !== "generated" && project.status !== "deployed") {
      return res.status(202).send(BUILDING_PAGE);
    }
    const state = await ensureBuilt(id);
    if (state.status === "ready") {
      touchPreviewAccess(id);
      // Portable relative-base bundles (./assets/…) need the trailing slash
      // so browsers resolve assets under /sites/:id/, not /sites/.
      if (!req.path.endsWith("/")) {
        return res.redirect(301, `${req.path}/`);
      }
      return res.sendFile(path.join(state.distDir, "index.html"));
    }
    if (state.status === "building") {
      return res.status(202).send(BUILDING_PAGE);
    }
    // failed/missing → legacy static placeholder fallback
    const base = path.resolve(process.cwd(), "generated-projects");
    const file = path.resolve(
      project.generatedCodePath as string,
      "preview",
      "index.html"
    );
    if (!file.startsWith(base) || !fs.existsSync(file)) {
      return res.status(404).send("Site not found");
    }
    res.sendFile(file);
  } catch {
    res.status(500).send("Failed to load site");
  }
});

// Built assets for honest previews (base /sites/:id/ baked at build time).
app.get("/sites/:id/assets/*", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      return res.status(400).send("Invalid site id");
    }
    const state = await ensureBuilt(id);
    if (state.status !== "ready") {
      return res.status(404).send("Asset not ready");
    }
    const sub = (req.params as any)[0] as string;
    const file = resolveDistAsset(state.distDir, path.join("assets", sub));
    if (!file) return res.status(404).send("Not found");
    touchPreviewAccess(id);
    res.sendFile(file);
  } catch {
    res.status(500).send("Failed to load asset");
  }
});

// ============================================================
// STATIC FILES & SPA FALLBACK
// ============================================================

if (process.env.NODE_ENV === "production") {
  const distPath = resolve(process.cwd(), "client/dist");
  const indexPath = resolve(distPath, "index.html");

  // Serve built frontend from client/dist/
  app.use(express.static(distPath));

  // SPA fallback
  app.get("*", (req: Request, res: Response) => {
    res.sendFile(indexPath);
  });
} else {
  // Development: show available endpoints
  app.get("/", (req: Request, res: Response) => {
    res.json({
      message: "Agentic Tournament Generator Platform API",
      version: "0.1.0",
      endpoints: {
        auth: {
          signup: "POST /api/auth/signup",
          login: "POST /api/auth/login",
          logout: "POST /api/auth/logout",
          me: "GET /api/auth/me",
        },
        projects: {
          list: "GET /api/projects",
          create: "POST /api/projects",
          get: "GET /api/projects/:id",
          update: "PUT /api/projects/:id",
          delete: "DELETE /api/projects/:id",
        },
        generation: {
          start: "POST /api/projects/:id/generate",
          status: "GET /api/projects/:id/generation-status",
          logs: "GET /api/projects/:id/generation-logs",
        },
        deployment: {
          platform: "POST /api/projects/:id/deploy-platform",
          github: "POST /api/projects/:id/push-github",
          status: "GET /api/projects/:id/deployment",
        },
      },
      docs: "http://localhost:5000/swagger",
    });
  });
}

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    method: req.method,
  });
});

// ============================================================
// ERROR HANDLING (Must be last)
// ============================================================

app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================

const server = createServer(app);

// Persistent storage bootstrap: create extension/types/tables if missing.
// Without this, auth ran on in-memory Maps wiped by every restart.
if (process.env.DATABASE_URL) {
  try {
    await ensureDatabase();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
} else {
  console.warn("[DB] DATABASE_URL not set — using ephemeral in-memory storage");
}

// Drop honest-preview build caches untouched for PREVIEW_CACHE_DAYS (default
// 14, 0 disables). Sources are never deleted — next preview rebuilds.
try {
  prunePreviewCaches();
} catch (err) {
  console.error("[Preview] Boot prune failed (non-fatal):", err instanceof Error ? err.message : err);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔════════════════════════════════════════════╗
║  Agentic Tournament Generator Platform     ║
╚════════════════════════════════════════════╝

🚀 Server running at http://localhost:${PORT}
📝 API Documentation: http://localhost:${PORT}/
⚡ Environment: ${process.env.NODE_ENV || "development"}
🔐 Session Secret: ${process.env.SESSION_SECRET ? "✓" : "⚠ NOT SET"}
🤖 LLM: ${process.env.QUBRID_API_KEY ? `✓ Qubrid (${process.env.QUBRID_MODEL || "default"})` : process.env.ANTHROPIC_API_KEY ? "✓ Claude" : "⚠ NOT SET (mock only)"}
🗄️  Database: ${process.env.DATABASE_URL ? "✓ Configured" : "⚠ NOT SET"}
🔴 Redis Queue: ✓ Connected & Ready

Ready to accept requests...
  `);
});

export default app;
