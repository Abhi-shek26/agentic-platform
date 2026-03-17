import express, { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createServer } from "http";
import apiRoutes from "./routes";
import { errorHandler } from "./utils/errors";
import "./utils/passport";

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Session management
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
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
// STATIC FILES & SPA FALLBACK
// ============================================================

if (process.env.NODE_ENV === "production") {
  // Serve static files from dist
  app.use(express.static(resolve(__dirname, "../dist/public")));

  // SPA fallback
  app.get("*", (req: Request, res: Response) => {
    res.sendFile(resolve(__dirname, "../dist/public/index.html"));
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔════════════════════════════════════════════╗
║  Agentic Tournament Generator Platform     ║
╚════════════════════════════════════════════╝

🚀 Server running at http://localhost:${PORT}
📝 API Documentation: http://localhost:${PORT}/
⚡ Environment: ${process.env.NODE_ENV || "development"}
🔐 Session Secret: ${process.env.SESSION_SECRET ? "✓" : "⚠ NOT SET"}
🤖 Claude API: ${process.env.ANTHROPIC_API_KEY ? "✓ Configured" : "⚠ NOT SET"}
🗄️  Database: ${process.env.DATABASE_URL ? "✓ Configured" : "⚠ NOT SET"}

Ready to accept requests...
  `);
});

export default app;
