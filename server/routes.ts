import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import {
  hashPassword,
  verifyPassword,
  validateEmail,
  validateUsername,
  validatePassword as validatePasswordStrength,
  signSessionToken,
  verifySessionToken,
} from "./utils/auth";
import { queueGenerationJob, getJobStatus } from "./queue/jobQueue";
import { GenerationProgressTracker } from "./utils/progressEmitter";
import { CodeDownloader } from "./utils/codeDownloader";
import { CodePreview } from "./utils/codePreview";
import { deployToVercel } from "./deployment/vercelDeploy";
import * as fs from "fs";
import * as path from "path";

const router = Router();

// ============================================================
// MIDDLEWARE
// ============================================================

/**
 * Middleware to check if user is authenticated.
 * Sessions are stateless HMAC-signed tokens (userId + expiry) verified
 * against SESSION_SECRET and resolved via persistent storage — they survive
 * container restarts, unlike the old in-memory token map.
 */
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check session first (for browser-based requests)
  if (req.user) {
    console.log(`[AUTH] ✓ Session auth - User ID: ${(req.user as any).id}`);
    return next();
  }

  // Check Bearer token (for API requests)
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.warn("[AUTH] ✗ No authorization header");
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.warn("[AUTH] ✗ Invalid authorization header format");
    return res.status(401).json({ error: "Unauthorized - Invalid token format" });
  }

  const token = authHeader.substring(7);
  const session = verifySessionToken(token);

  if (!session) {
    console.warn(`[AUTH] ✗ Invalid or expired token`);
    return res.status(401).json({ error: "Unauthorized - Invalid or expired token" });
  }

  try {
    const user = await storage.getUser(session.userId);
    if (!user) {
      console.warn(`[AUTH] ✗ Token user not found: ${session.userId}`);
      return res.status(401).json({ error: "Unauthorized - Invalid or expired token" });
    }
    console.log(`[AUTH] ✓ Token auth - User ID: ${user.id}`);
    req.user = user;
    return next();
  } catch (error) {
    console.error("[AUTH] Token auth error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * GET /api/auth/debug
 * Debug endpoint - DO NOT use in production
 */
router.get("/auth/debug", (req: Request, res: Response) => {
  res.json({
    sessions: "stateless HMAC tokens (no server-side map)",
    authHeader: req.headers.authorization ? "Present" : "Missing",
  });
});

/**
 * POST /api/auth/signup
 * Create new user account
 */
router.post("/auth/signup", async (req: Request, res: Response) => {
  try {
    const { email, username, password, displayName } = req.body;

    console.log(`[AUTH] Signup attempt - Email: ${email}, Username: ${username}`);

    // Validate inputs
    if (!email || !username || !password) {
      console.warn("[AUTH] Signup failed - Missing required fields");
      return res.status(400).json({
        error: "Email, username, and password are required",
      });
    }

    if (!validateEmail(email)) {
      console.warn(`[AUTH] Signup failed - Invalid email: ${email}`);
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!validateUsername(username)) {
      console.warn(`[AUTH] Signup failed - Invalid username: ${username}`);
      return res.status(400).json({
        error: "Username must be 3-20 characters, alphanumeric and underscore only",
      });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      console.warn(`[AUTH] Signup failed - Weak password`);
      return res.status(400).json({
        error: "Password requirements not met",
        details: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      console.warn(`[AUTH] Signup failed - Email already registered: ${email}`);
      return res.status(409).json({ error: "Email already registered" });
    }

    const existingUsername = await storage.getUserByUsername(username);
    if (existingUsername) {
      console.warn(`[AUTH] Signup failed - Username taken: ${username}`);
      return res.status(409).json({ error: "Username already taken" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user (email normalized to lowercase at the storage boundary)
    const user = await storage.createUser({
      email,
      username,
      password: hashedPassword,
      displayName: displayName || username,
    });

    console.log(`[AUTH] ✓ User created - ID: ${user.id}, Email: ${email}`);

    // Stateless session token (survives restarts)
    const token = signSessionToken(user.id);
    console.log(`[AUTH] Token issued for signup - Token: ${token.substring(0, 10)}...`);

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      },
      token,
    });
  } catch (error) {
    console.error("[AUTH] Signup error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Signup failed",
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log(`[AUTH] Login attempt - Email: ${email}`);

    if (!email || !password) {
      console.warn("[AUTH] Login failed - Missing email or password");
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Get user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      console.warn(`[AUTH] Login failed - User not found: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.password) {
      console.warn(`[AUTH] Login failed - No password set for user: ${email}`);
      return res.status(401).json({
        error: "This account uses OAuth. Please sign in with OAuth provider.",
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      console.warn(`[AUTH] Login failed - Invalid password for user: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate stateless session token
    const token = signSessionToken(user.id);
    console.log(`[AUTH] ✓ Login successful - User: ${user.id}, Token: ${token.substring(0, 10)}...`);

    // ✅ RETURN TOKEN IN LOGIN RESPONSE
    const response = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      },
      token: token,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("[AUTH] Login error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Login failed",
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroy session and logout user
 */
router.post("/auth/logout", requireAuth, (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get("/auth/me", requireAuth, (req: Request, res: Response) => {
  const user = req.user as any;
  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      subscriptionTier: user.subscriptionTier,
    },
  });
});

// ============================================================
// PROJECTS ROUTES
// ============================================================

/**
 * GET /api/projects
 * List all projects for authenticated user
 */
router.get("/projects", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    // Get user's projects (using user.id as organizationId for now)
    console.log(`[DEBUG] GET /projects - User ID: ${user.id}`);
    const projects = await storage.listProjects(user.id);
    console.log(`[DEBUG] GET /projects - Found ${projects.length} projects`);

    res.status(200).json({ projects });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list projects",
    });
  }
});

/**
 * POST /api/projects
 * Create new project with tournament specification
 */
router.post("/projects", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { name, slug, description, specification } = req.body;

    // Validate required fields
    if (!name || !slug || !specification) {
      return res.status(400).json({
        error: "Name, slug, and specification are required",
      });
    }

    // Slug validation (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        error: "Slug must contain only lowercase letters, numbers, and hyphens",
      });
    }

    // TODO: Get or create user's primary organization
    // For now, use user ID as organization ID for ownership tracking
    const orgId = user.id;

    console.log(`[DEBUG] Creating project - User ID: ${user.id}, Org ID: ${orgId}`);
    const project = await storage.createProject({
      organizationId: orgId,
      name,
      slug,
      description,
      specification,
    });

    console.log(`[DEBUG] Project created - Project ID: ${project.id}, Org ID: ${project.organizationId}`);

    res.status(201).json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        createdAt: project.createdAt,
      },
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to create project",
    });
  }
});

/**
 * GET /api/projects/:id
 * Get project details
 */
router.get("/projects/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.status(200).json({ project });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get project",
    });
  }
});

/**
 * PUT /api/projects/:id
 * Update project specification
 */
router.put("/projects/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { specification, name, description } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (specification) updates.specification = specification;

    const project = await storage.updateProject(req.params.id, updates);

    res.status(200).json({
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Failed to update project",
    });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project
 */
router.delete("/projects/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    await storage.deleteProject(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to delete project",
    });
  }
});

// ============================================================
// GENERATION ROUTES
// ============================================================

/**
 * POST /api/projects/:id/generate
 * Start AI-powered generation of tournament website
 */
router.post(
  "/projects/:id/generate",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const projectId = req.params.id;

      // Get project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Check generation quota
      const currentUser = await storage.getUser(user.id);
      const used = currentUser?.generationUsed ?? 0;
      const quota = currentUser?.generationQuota ?? 5;
      if (currentUser && used >= quota) {
        return res.status(429).json({
          error: "Generation quota exceeded",
          used,
          quota,
        });
      }

      // Create generation job
      const job = await storage.createGenerationJob({
        projectId,
        status: "queued",
      });

      // Queue job in Bull queue for processing by orchestrator
      await queueGenerationJob(projectId, project.name, project.specification);

      res.status(202).json({
        jobId: job.id,
        status: "queued",
        message: "Generation job queued. Check status for updates.",
      });
    } catch (error) {
      console.error("Generate error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to start generation",
      });
    }
  }
);

/**
 * GET /api/projects/:id/generation-status
 * Get real-time generation status and progress
 */
router.get(
  "/projects/:id/generation-status",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.id;

      // Get latest progress from tracker
      const progress = GenerationProgressTracker.getProgress(projectId);

      // Get job status from Bull queue
      const jobId = `generation-${projectId}`;
      const jobStatus = await getJobStatus(jobId);

      // Return combined status
      res.status(200).json({
        ...progress,
        jobId: jobStatus?.jobId,
        bullState: jobStatus?.state,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get status",
      });
    }
  }
);

/**
 * GET /api/projects/:id/generation-logs
 * Get agent generation logs
 */
router.get(
  "/projects/:id/generation-logs",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      // TODO: Get logs from generation job
      res.status(200).json({
        logs: [
          { timestamp: new Date().toISOString(), level: "info", agent: "System", message: "Generation job started" },
        ],
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get logs",
      });
    }
  }
);

/**
 * GET /api/projects/:id/code
 * Download generated project code as ZIP
 */
router.get(
  "/projects/:id/code",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const projectId = req.params.id;

      // Get project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Verify user owns project
      if (project.organizationId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Check if project has been generated
      if (project.status !== "generated" && project.status !== "deployed") {
        return res.status(400).json({
          error: "Project has not been generated yet",
          status: project.status,
        });
      }

      // Get generated project path
      const generatedCodePath = (project as any).generatedCodePath;
      if (!generatedCodePath) {
        return res.status(404).json({ error: "Generated code not found" });
      }

      console.log(`📥 Starting download for project: ${projectId}`);
      console.log(`   Project path: ${generatedCodePath}`);

      // Create archive
      const archiveResult = await CodeDownloader.createProjectArchive(
        generatedCodePath,
        projectId,
        project.name
      );

      if (!archiveResult.success || !archiveResult.filePath) {
        return res.status(500).json({
          error: archiveResult.error || "Failed to create archive",
        });
      }

      console.log(`✓ Archive ready: ${archiveResult.filePath}`);

      // Send file as download
      await CodeDownloader.sendFileDownload(archiveResult.filePath, project.name, res);
    } catch (error) {
      console.error("Download error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Failed to download",
        });
      }
    }
  }
);

/**
 * GET /api/projects/:id/code-info
 * Get information about generated code (files, structure, stats)
 */
router.get(
  "/projects/:id/code-info",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const projectId = req.params.id;

      // Get project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Verify user owns project
      if (project.organizationId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Check if project has been generated
      if (project.status !== "generated" && project.status !== "deployed") {
        return res.status(400).json({
          error: "Project has not been generated yet",
        });
      }

      const generatedCodePath = (project as any).generatedCodePath;
      if (!generatedCodePath) {
        return res.status(404).json({ error: "Generated code not found" });
      }

      // Get code info
      const codeInfo = CodePreview.getCodeInfo(generatedCodePath, project.name, projectId);
      const codeStats = CodePreview.getCodeStats(generatedCodePath);

      res.json({
        ...codeInfo,
        stats: codeStats,
      });
    } catch (error) {
      console.error("Code info error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get code info",
      });
    }
  }
);

/**
 * GET /api/projects/:id/code-preview
 * Get preview of a specific file from generated code
 */
router.get(
  "/projects/:id/code-preview",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const projectId = req.params.id;
      const filePath = req.query.file as string;

      if (!filePath) {
        return res.status(400).json({ error: "File path required" });
      }

      // Get project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Verify user owns project
      if (project.organizationId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const generatedCodePath = (project as any).generatedCodePath;
      if (!generatedCodePath) {
        return res.status(404).json({ error: "Generated code not found" });
      }

      // Get file preview
      const preview = CodePreview.getFilePreview(generatedCodePath, filePath);

      res.json({
        fileName: filePath,
        content: preview.content,
        totalLines: preview.totalLines,
        truncated: preview.truncated,
      });
    } catch (error) {
      console.error("Code preview error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get preview",
      });
    }
  }
);

// ============================================================
// DEPLOYMENT ROUTES
// ============================================================

/**
 * POST /api/projects/:id/deploy-platform
 * Publish the generated site on local platform hosting (/sites/:id).
 * Instant: serves the pre-built preview page, no build step.
 */
router.post(
  "/projects/:id/deploy-platform",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.status !== "generated" && project.status !== "deployed") {
        return res.status(400).json({
          error: "Generate the project before deploying",
          status: project.status,
        });
      }

      const siteUrl = `/sites/${project.id}`;
      await storage.updateProject(project.id, {
        status: "deployed",
        deploymentStatus: "live",
        hostedUrl: siteUrl,
      } as any);

      res.status(200).json({
        message: "Site is live on platform hosting",
        siteUrl,
        deploymentStatus: "live",
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to deploy",
      });
    }
  }
);

/**
 * GET /api/projects/:id/site
 * Hosting info for a project (ready flag + URLs).
 */
router.get(
  "/projects/:id/site",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      const previewPath = project.generatedCodePath
        ? path.join(project.generatedCodePath as string, "preview", "index.html")
        : null;
      const ready =
        (project.status === "generated" || project.status === "deployed") &&
        !!previewPath &&
        fs.existsSync(previewPath);
      res.status(200).json({
        ready,
        siteUrl: ready ? `/sites/${project.id}` : null,
        hostedUrl: (project as any).hostedUrl ?? null,
        deploymentStatus: project.deploymentStatus ?? "pending",
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get site info",
      });
    }
  }
);

/**
 * POST /api/projects/:id/deploy-vercel
 * One-click deploy to Vercel (public URL). Needs VERCEL_TOKEN in env
 * or { vercelToken } in body. Free tier compatible.
 */
router.post(
  "/projects/:id/deploy-vercel",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.status !== "generated" && project.status !== "deployed") {
        return res.status(400).json({
          error: "Generate the project before deploying",
          status: project.status,
        });
      }
      const generatedCodePath = (project as any).generatedCodePath as string | undefined;
      if (!generatedCodePath || !fs.existsSync(generatedCodePath)) {
        return res.status(404).json({ error: "Generated code not found" });
      }

      const token = (req.body?.vercelToken as string | undefined)?.trim()
        || process.env.VERCEL_TOKEN?.trim();
      if (!token) {
        return res.status(400).json({
          error: "Vercel token required (set VERCEL_TOKEN or pass vercelToken)",
        });
      }

      // Best-effort: ensure the honest-preview build exists so Vercel gets
      // the real app. Failures fall back to the static placeholder inside
      // deployToVercel — deploys never break because of the build.
      try {
        const { ensureBuilt } = await import("./utils/siteBuilder");
        await ensureBuilt(project.id);
      } catch (err) {
        console.warn("[Deploy] Preview build failed, deploying fallback:", err instanceof Error ? err.message : err);
      }

      const result = await deployToVercel(generatedCodePath, project.name, token);
      if (!result.success) {
        await storage.updateProject(project.id, { deploymentStatus: "failed" } as any);
        return res.status(502).json({ error: result.error || "Vercel deploy failed" });
      }

      await storage.updateProject(project.id, {
        deploymentStatus: "live",
        hostedUrl: result.url,
      } as any);

      res.status(200).json({
        message: "Deployed to Vercel",
        url: result.url,
        deploymentId: result.deploymentId,
        deploymentStatus: "live",
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to deploy to Vercel",
      });
    }
  }
);

/**
 * POST /api/projects/:id/push-github
 * Push generated code to GitHub
 */
router.post(
  "/projects/:id/push-github",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { githubToken } = req.body;
      const projectId = req.params.id;

      if (!githubToken) {
        return res.status(400).json({ error: "GitHub token required" });
      }

      // TODO: Push generated code to GitHub
      res.status(202).json({
        message: "GitHub sync started",
        repoUrl: "https://github.com/...",
        status: "syncing",
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to push to GitHub",
      });
    }
  }
);

/**
 * GET /api/projects/:id/deployment
 * Get deployment status
 */
router.get(
  "/projects/:id/deployment",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      res.status(200).json({
        deploymentStatus: "pending",
        deploymentUrl: null,
        buildLogs: [],
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get deployment status",
      });
    }
  }
);

export default router;
