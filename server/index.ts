import express, { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createServer } from "http";

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

// API routes (to be implemented)
app.use("/api/auth", (req: Request, res: Response) => {
  res.status(501).json({ error: "Authentication routes not yet implemented" });
});

app.use("/api/projects", (req: Request, res: Response) => {
  res.status(501).json({ error: "Project routes not yet implemented" });
});

app.use("/api/generation", (req: Request, res: Response) => {
  res.status(501).json({ error: "Generation routes not yet implemented" });
});

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
}

// ============================================================
// ERROR HANDLING
// ============================================================

interface CustomError extends Error {
  status?: number;
}

app.use(
  (err: CustomError, req: Request, res: Response, next: NextFunction) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
    });
  }
);

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
📝 API Documentation: http://localhost:${PORT}/api/docs
⚡ Environment: ${process.env.NODE_ENV || "development"}

Ready to accept requests...
  `);
});

export default app;
