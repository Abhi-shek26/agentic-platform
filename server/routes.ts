import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import {
  hashPassword,
  verifyPassword,
  validateEmail,
  validateUsername,
  validatePassword as validatePasswordStrength,
  ValidationError,
  AuthenticationError,
} from "./utils/auth";

const router = Router();

// ============================================================
// MIDDLEWARE
// ============================================================

/**
 * Middleware to check if user is authenticated
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
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

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
        },
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
router.get("/auth/me", (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

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

      // TODO: Queue job in Bull queue for processing by orchestrator

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
 * Get real-time generation status
 */
router.get(
  "/projects/:id/generation-status",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      // TODO: Get status from generation job queue
      res.status(200).json({
        status: "queued",
        progress: 0,
        message: "Waiting in queue...",
        agents: [
          { name: "SpecParser", status: "pending" },
          { name: "Architect", status: "pending" },
          { name: "Frontend", status: "pending" },
          { name: "Backend", status: "pending" },
          { name: "Database", status: "pending" },
          { name: "Integration", status: "pending" },
          { name: "Config", status: "pending" },
          { name: "QA", status: "pending" },
        ],
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
