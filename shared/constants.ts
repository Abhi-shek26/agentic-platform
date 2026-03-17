/**
 * Shared constants used across frontend and backend
 */

// ============================================================
// API CONFIGURATION
// ============================================================

export const API_BASE_URL = process.env.VITE_API_URL || "http://localhost:5000";
export const API_TIMEOUT = 30000; // 30 seconds

// ============================================================
// USER CONFIGURATION
// ============================================================

export const SUBSCRIPTION_TIERS = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

export const GENERATION_QUOTAS = {
  free: 5,
  pro: 50,
  enterprise: Infinity,
} as const;

// ============================================================
// PROJECT CONFIGURATION
// ============================================================

export const PROJECT_STATUS = {
  DRAFT: "draft",
  GENERATING: "generating",
  GENERATED: "generated",
  DEPLOYED: "deployed",
  FAILED: "failed",
} as const;

export const DEPLOYMENT_STATUS = {
  PENDING: "pending",
  BUILDING: "building",
  LIVE: "live",
  FAILED: "failed",
} as const;

export const GENERATION_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

// ============================================================
// TOURNAMENT PAGES
// ============================================================

export const TOURNAMENT_PAGE_TYPES = [
  "home",
  "info",
  "schedule",
  "players",
  "pairings",
  "prizes",
  "venue",
  "hotel",
  "contact",
  "register",
  "sponsors",
  "articles",
  "custom",
] as const;

export const REQUIRED_PAGES = ["home", "info", "register"];

export const PAGE_DESCRIPTIONS = {
  home: "Tournament homepage with hero section",
  info: "Tournament information and details",
  schedule: "Tournament schedule and rounds",
  players: "Registered players list",
  pairings: "Round pairings",
  prizes: "Prize information",
  venue: "Venue information and map",
  hotel: "Hotel recommendations",
  contact: "Contact information",
  register: "Player registration form",
  sponsors: "Tournament sponsors",
  articles: "Blog articles and news",
} as const;

// ============================================================
// AI AGENTS
// ============================================================

export const AGENTS = [
  "SpecParser",
  "Architect",
  "Frontend",
  "Backend",
  "Database",
  "Integration",
  "Config",
  "QA",
] as const;

export const AGENT_DESCRIPTIONS = {
  SpecParser: "Validates and structures user specifications",
  Architect: "Designs project structure and architecture",
  Frontend: "Generates React components and UI",
  Backend: "Generates Express routes and API logic",
  Database: "Generates database schema and migrations",
  Integration: "Sets up external API integrations",
  Config: "Generates configuration files",
  QA: "Validates and tests generated code",
} as const;

// ============================================================
// COLOR SCHEMES
// ============================================================

export const DEFAULT_COLOR_SCHEMES = {
  modern: {
    primary: "#0ea5e9",
    secondary: "#64748b",
    accent: "#ec4899",
    background: "#ffffff",
    text: "#1e293b",
  },
  classic: {
    primary: "#1e40af",
    secondary: "#475569",
    accent: "#dc2626",
    background: "#f8fafc",
    text: "#0f172a",
  },
  vibrant: {
    primary: "#7c3aed",
    secondary: "#ec4899",
    accent: "#f59e0b",
    background: "#fafafa",
    text: "#1f2937",
  },
} as const;

// ============================================================
// VALIDATION RULES
// ============================================================

export const VALIDATION = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  PASSWORD_MIN: 8,
  SLUG_PATTERN: /^[a-z0-9-]+$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// ============================================================
// LIMITS
// ============================================================

export const LIMITS = {
  MAX_PROJECT_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_CUSTOM_COMPONENTS: 50,
  MAX_PAGE_SECTIONS: 100,
  GENERATION_TIMEOUT: 5 * 60 * 1000, // 5 minutes
} as const;

// ============================================================
// TIMEOUTS
// ============================================================

export const TIMEOUTS = {
  API_REQUEST: 30000,
  GENERATION: 300000, // 5 minutes
  DEPLOYMENT: 600000, // 10 minutes
  DATABASE_QUERY: 10000,
} as const;
