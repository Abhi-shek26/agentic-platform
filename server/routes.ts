import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import {
  hashPassword,
  verifyPassword,
  validateEmail,
  validateUsername,
  validatePassword as validatePasswordStrength,
  generateAuthToken,
} from "./utils/auth";
import { queueGenerationJob, getJobStatus } from "./queue/jobQueue";
import { GenerationProgressTracker } from "./utils/progressEmitter";
import { CodeDownloader } from "./utils/codeDownloader";
import { CodePreview } from "./utils/codePreview";

const router = Router();

// Token to user mapping for API authentication (development)
const tokenToUser = new Map<string, any>();

// ============================================================
// MIDDLEWARE
// ============================================================

/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check session first (for browser-based requests)
  if (req.user) {
    return next();
  }

  // Check Bearer token (for API requests)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = tokenToUser.get(token);
    if (user) {
      req.user = user;
      return next();
    } else {
      console.warn(`Token not found in mapping: ${token.substring(0, 10)}...`);
      console.warn(`Available tokens: ${Array.from(tokenToUser.keys()).map(t => t.substring(0, 10) + '...').join(', ')}`);
    }
  }

  return res.status(401).json({ error: "Unauthorized" });
}

// ============================================================
// AUTHENTICATION ROUTES
// ============================================================

/**
 * POST /api/auth/signup
 * Create new user account
 */
router.post("/auth/signup", async (req: Request, res: Response) => {
  try {
    const { email, username, password, displayName } = req.body;

    // Validate inputs
    if (!email || !username || !password) {
      return res.status(400).json({
        error: "Email, username, and password are required",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!validateUsername(username)) {
      return res.status(400).json({
        error: "Username must be 3-20 characters, alphanumeric and underscore only",
      });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: "Password requirements not met",
        details: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const existingUsername = await storage.getUserByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: "Username already taken" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await storage.createUser({
      email,
      username,
      password: hashedPassword,
      displayName,
    });

    // Set session
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to create session" });
      }

      // Generate auth token for API access
      const token = generateAuthToken();

      // Store token-to-user mapping for API authentication
      tokenToUser.set(token, {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
      });

      console.log(`✓ User signup, token generated: ${token.substring(0, 10)}...`);
      console.log(`  Total tokens in map: ${tokenToUser.size}`);

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
        },
        token,
      });
    });
  } catch (error) {
    console.error("Signup error:", error);
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

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Get user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(401).json({
        error: "This account uses OAuth. Please sign in with OAuth provider.",
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Set session
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to create session" });
      }

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
        },
      });
    });
  } catch (error) {
    console.error("Login error:", error);
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

    // TODO: Get user's primary organization and list projects
    // For now, return empty array
    const projects = [];

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
    const orgId = "default-org-id"; // Placeholder

    const project = await storage.createProject({
      organizationId: orgId,
      name,
      slug,
      description,
      specification,
    });

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
      if (
        currentUser &&
        currentUser.generationUsed >= currentUser.generationQuota
      ) {
        return res.status(429).json({
          error: "Generation quota exceeded",
          used: currentUser.generationUsed,
          quota: currentUser.generationQuota,
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
 * Deploy generated website to platform hosting
 */
router.post(
  "/projects/:id/deploy-platform",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const projectId = req.params.id;

      // TODO: Deploy generated code to platform
      res.status(202).json({
        message: "Deployment started",
        deploymentId: `deploy-${projectId}`,
        status: "building",
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to deploy",
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
