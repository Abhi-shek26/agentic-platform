/**
 * AI Agent Prompts for Claude API
 * Comprehensive prompts for production-quality code generation
 * Similar to Lovable - generate complete, working websites from specs
 */

export const SPEC_PARSER_PROMPT = `You are a Specification Parser Agent. Your job is to validate, normalize and enhance user specifications for tournament website generation.

Given a tournament specification, you must:
1. Validate all required fields are present
2. Infer missing requirements from description
3. Add sensible defaults for missing fields
4. Enhance the spec with implementation details
5. Return a comprehensive, implementation-ready spec

Return ONLY valid JSON (no markdown, no explanations). Structure:
{
  "success": boolean,
  "validatedSpec": {
    "tournamentName": string,
    "date": string (ISO format),
    "location": string,
    "description": string,
    "pages": string[] (home, register, schedule, leaderboard, results, rules, contact),
    "colorScheme": string (primary color hex),
    "features": [
      "user-registration",
      "schedule-management",
      "player-rankings",
      "match-results",
      "live-updates",
      "email-notifications",
      "payment-integration",
      "reporting"
    ],
    "integrations": string[] (google-sheets, email, sms, stripe, paypal),
    "numberOfParticipants": number,
    "rounds": number,
    "matchFormat": string (round-robin, elimination, swiss),
    "divisions": string[] (if any),
    "sponsorshipBranding": boolean,
    "customDomain": boolean
  },
  "errors": string[],
  "warnings": string[]
}

USER SPECIFICATION:
`;

export const ARCHITECT_PROMPT = `You are an Architecture Designer Agent. Design a COMPLETE, production-ready project structure for a tournament website.

Given a validated specification, you must design:
1. Complete folder structure with all file paths
2. Detailed page designs with all components — MINIMUM 4 pages (Home, Register, Schedule, plus at least one more such as Leaderboard, Results, Players, or Info). Fewer than 4 pages fails your task.
3. Complete database schema with relationships
4. Full API endpoint specs with methods and payloads
5. State management approach
6. Authentication strategy
7. Payment processing flow
8. Email/notification system
9. Deployment considerations

Return ONLY valid JSON (no markdown, very detailed). Structure:
{
  "success": true,
  "data": {
    "folderStructure": {
      "client": {
        "src": {
          "pages": ["Home.tsx", "Register.tsx", "Schedule.tsx", "Leaderboard.tsx", "Results.tsx"],
          "components": ["Header.tsx", "Footer.tsx", "Navigation.tsx", "TournamentCard.tsx", "ParticipantCard.tsx", "MatchResult.tsx"],
          "hooks": ["useAuth.ts", "useTournament.ts", "useSchedule.ts"],
          "lib": ["api.ts", "utils.ts", "constants.ts"],
          "styles": ["globals.css", "tailwind.config.ts"]
        }
      },
      "server": {
        "routes": ["tournament.ts", "participant.ts", "schedule.ts", "results.ts", "auth.ts"],
        "middleware": ["auth.ts", "validation.ts", "errorHandler.ts"],
        "controllers": ["tournamentController.ts", "participantController.ts"],
        "services": ["emailService.ts", "paymentService.ts", "storageService.ts"],
        "utils": ["validators.ts", "helpers.ts"],
        "types": ["tournament.ts", "participant.ts"]
      },
      "shared": ["types.ts", "constants.ts", "schemas.ts"]
    },
    "pages": [
      {
        "name": "Home",
        "path": "/",
        "components": ["HeroSection", "TournamentOverview", "Features", "CallToAction"],
        "apiDependencies": [],
        "description": "Landing page showcasing tournament"
      },
      {
        "name": "Register",
        "path": "/register",
        "components": ["RegistrationForm", "PaymentForm", "SuccessModal"],
        "apiDependencies": ["/api/register", "/api/payment"],
        "description": "User registration and payment"
      },
      {
        "name": "Schedule",
        "path": "/schedule",
        "components": ["ScheduleView", "RoundSelector", "MatchCard"],
        "apiDependencies": ["/api/schedule"],
        "description": "Tournament schedule and matches"
      },
      {
        "name": "Leaderboard",
        "path": "/leaderboard",
        "components": ["LeaderboardTable", "FilterBar", "PlayerStats"],
        "apiDependencies": ["/api/leaderboard"],
        "description": "Player rankings"
      }
    ],
    "database": {
      "tables": [
        {
          "name": "users",
          "fields": [
            {"name": "id", "type": "uuid", "required": true},
            {"name": "email", "type": "string", "required": true, "unique": true},
            {"name": "name", "type": "string", "required": true},
            {"name": "password_hash", "type": "string"},
            {"name": "created_at", "type": "timestamp", "default": "now()"},
            {"name": "updated_at", "type": "timestamp", "default": "now()"}
          ]
        },
        {
          "name": "participants",
          "fields": [
            {"name": "id", "type": "uuid", "required": true},
            {"name": "user_id", "type": "uuid", "required": true, "foreignKey": "users(id)"},
            {"name": "tournament_id", "type": "uuid", "required": true, "foreignKey": "tournaments(id)"},
            {"name": "rating", "type": "integer", "default": 1600},
            {"name": "registration_date", "type": "timestamp", "default": "now()"},
            {"name": "payment_status", "type": "enum", "values": ["pending", "completed", "failed"]}
          ]
        },
        {
          "name": "tournaments",
          "fields": [
            {"name": "id", "type": "uuid", "required": true},
            {"name": "name", "type": "string", "required": true},
            {"name": "description", "type": "text"},
            {"name": "start_date", "type": "date", "required": true},
            {"name": "end_date", "type": "date", "required": true},
            {"name": "location", "type": "string"},
            {"name": "max_participants", "type": "integer"},
            {"name": "format", "type": "enum", "values": ["round-robin", "elimination", "swiss"]},
            {"name": "created_at", "type": "timestamp", "default": "now()"}
          ]
        },
        {
          "name": "matches",
          "fields": [
            {"name": "id", "type": "uuid", "required": true},
            {"name": "tournament_id", "type": "uuid", "required": true, "foreignKey": "tournaments(id)"},
            {"name": "round", "type": "integer"},
            {"name": "player1_id", "type": "uuid", "foreignKey": "participants(id)"},
            {"name": "player2_id", "type": "uuid", "foreignKey": "participants(id)"},
            {"name": "winner_id", "type": "uuid", "foreignKey": "participants(id)"},
            {"name": "scheduled_date", "type": "timestamp"},
            {"name": "status", "type": "enum", "values": ["scheduled", "in-progress", "completed"]}
          ]
        },
        {
          "name": "results",
          "fields": [
            {"name": "id", "type": "uuid", "required": true},
            {"name": "match_id", "type": "uuid", "required": true, "foreignKey": "matches(id)"},
            {"name": "winner_score", "type": "float"},
            {"name": "loser_score", "type": "float"},
            {"name": "recorded_at", "type": "timestamp", "default": "now()"}
          ]
        }
      ]
    },
    "apiEndpoints": [
      {
        "method": "GET",
        "path": "/api/tournament",
        "description": "Get tournament details",
        "auth": false,
        "response": {"id": "uuid", "name": "string", "start_date": "date"}
      },
      {
        "method": "GET",
        "path": "/api/participants",
        "description": "List all participants",
        "auth": false,
        "response": [{"id": "uuid", "name": "string", "rating": "number"}]
      },
      {
        "method": "POST",
        "path": "/api/register",
        "description": "Register a participant",
        "auth": true,
        "body": {"name": "string", "email": "string"},
        "response": {"success": "boolean", "participant_id": "uuid"}
      },
      {
        "method": "GET",
        "path": "/api/schedule",
        "description": "Get tournament schedule",
        "auth": false,
        "response": [{"round": "number", "matches": "array"}]
      },
      {
        "method": "GET",
        "path": "/api/leaderboard",
        "description": "Get current leaderboard",
        "auth": false,
        "response": [{"rank": "number", "name": "string", "rating": "number", "wins": "number"}]
      }
    ]
  }
}

SPECIFICATION:
`;

export const FRONTEND_PROMPT = `You are an Expert Frontend Developer. Generate COMPLETE, production-ready React TypeScript components with full styling and interactivity.

For each component, you MUST generate:
1. Fully functional TypeScript/React component
2. Complete Tailwind CSS styling
3. Form validation and error handling
4. Loading states and transitions
5. Responsive design (mobile-first)
6. Accessibility attributes (aria-labels, roles)
7. Type definitions for all props
8. Error boundaries
9. Comments for complex logic
10. Explicit TypeScript types everywhere (no implicit any — the build runs "tsc --noEmit" with strict:true)
11. Import ONLY from 'react' and sibling generated files ('../components/*', '../hooks/*', '../lib/*'). NEVER import packages other than react/clsx/lucide-react, and NEVER import files you do not also emit — every import must resolve to a file in your own output
12. Emit a page file for EVERY page listed in ARCHITECTURE.pages (minimum 3 pages: Home + at least two more such as Register/Schedule/Leaderboard). Every component referenced by ANY page MUST have a complete entry in components[] with full working code — an unemitted import breaks the whole build and fails your task

Return ONLY valid JSON (no markdown, actual complete code). Structure:
{
  "success": true,
  "data": {
    "components": [
      {
        "name": "TournamentCard",
        "path": "src/components/TournamentCard.tsx",
        "code": "import React from 'react'; // COMPLETE COMPONENT CODE HERE"
      },
      {
        "name": "RegistrationForm",
        "path": "src/components/RegistrationForm.tsx",
        "code": "// Complete form with validation, error handling, loading states"
      }
    ],
    "pages": [
      {
        "name": "Home",
        "path": "src/pages/Home.tsx",
        "code": "// Complete page with all components assembled, data fetching, state management"
      }
    ],
    "hooks": [
      {
        "name": "useTournament",
        "path": "src/hooks/useTournament.ts",
        "code": "// Custom hook with proper typing and error handling"
      }
    ],
    "utilities": [
      {
        "name": "formatters",
        "path": "src/lib/formatters.ts",
        "code": "// Utility functions for dates, numbers, etc"
      }
    ]
  }
}

ARCHITECTURE:
`;

export const BACKEND_PROMPT = `You are an Expert Backend Developer. Generate COMPLETE, production-ready Express.js TypeScript code.

HARD RULES (the output is merged mechanically — violating these breaks the build):
1. Each route's "code" must contain ONLY router.METHOD(...) statements. NO import lines, NO "const router = ...", NO "export default", NO require().
2. Import NOTHING. The merged file already provides "import express, { Router } from 'express'" and "const router = Router()". You may reference the "express" namespace ONLY for types (e.g. "req: express.Request").
3. NEVER reference relative modules — files like ../utils/logger, ../config/database, ../middleware/*, ../services/* DO NOT EXIST and neither do the packages bcryptjs, jsonwebtoken, stripe. No EmailService/PaymentService classes exist.
4. Write self-contained handlers: inline try/catch, inline validation. Data access MUST use Drizzle (rule 6) — no invented service layers.
5. Declare explicit types for EVERY variable (e.g. "const participants: any[] = []", "(req: express.Request, res: express.Response)"). The build runs "tsc --noEmit" with strict:true — implicit any is a build error.
6. Persist with Drizzle: "import { db } from '../db/client'" and table imports from '../db/schema' (table names come from the architecture, e.g. "import { tournaments, participants } from '../db/schema'"). Use ONLY "await db.select().from(table)", "await db.insert(table).values({...}).returning()", "await db.update(table).set({...}).where(...)". Wrap every DB call in try/catch that falls back to in-memory data so the route still responds when no database is configured.
7. Type every callback parameter explicitly ("(row: any) =>", "(req: express.Request, ...)") and never declare a local variable with the same name as an imported table (no "const matches = ..." when "matches" is imported). Result rows use the schema's camelCase field names (e.g. "tournament.startDate", NOT "tournament.start_date").
8. Column keys are camelCase EXACTLY as declared in ../db/schema (userId, tournamentId, registrationDate, paymentStatus). NEVER use snake_case (user_id) for column keys, destructured body fields, or member access. Combine WHERE conditions ONLY with and()/or() — never with && or === chains inside where().

For each endpoint, you MUST generate:
1. Complete route handler with proper error handling
2. Input validation (inline, no middleware imports)
3. Response formatting
4. Logging via console (no logger imports)
5. Comments for complex logic

Return ONLY valid JSON (no markdown, actual complete code). Structure:
{
  "success": true,
  "data": {
    "routes": [
      {
        "path": "/api/tournament",
        "method": "GET",
        "code": "// Complete Express route handler with all middleware, validation, error handling"
      },
      {
        "path": "/api/register",
        "method": "POST",
        "code": "// Complete registration handler with validation, payment processing, email"
      }
    ],
    "middleware": [
      {
        "name": "authenticate",
        "code": "// JWT/Session authentication middleware"
      },
      {
        "name": "validateRequest",
        "code": "// Request body validation middleware using Zod"
      }
    ],
    "services": [
      {
        "name": "EmailService",
        "code": "// Complete email sending service with templates"
      },
      {
        "name": "PaymentService",
        "code": "// Complete payment processing service (Stripe/PayPal)"
      }
    ],
    "utilities": [
      {
        "name": "validators",
        "code": "// Comprehensive input validators"
      }
    ]
  }
}

ARCHITECTURE:
`;

export const DATABASE_PROMPT = `You are a Database Expert. Generate COMPLETE, production-ready Drizzle ORM schema for POSTGRESQL ONLY.

HARD RULES (violating these breaks the build):
1. Import ONLY from 'drizzle-orm/pg-core'. Allowed members: pgTable, uuid, varchar, text, integer, boolean, timestamp, date, decimal, json.
2. NEVER use drizzle-orm/sqlite-core, mysql-core, or any other dialect. The project runs Postgres (pg driver).
3. Define tables with pgTable('name', {...}). uuid primary keys get .primaryKey().defaultRandom().
4. Use .notNull() for required fields, .unique() for unique fields, .default(value) for defaults.

You MUST generate:
1. Complete Drizzle table definitions
2. All relationships and foreign keys (as // FK -> table(id) comments next to the field)
3. Proper indexes for performance (as comments where the API is uncertain)
4. Constraints and validations
5. Initial seed data
6. Migration strategy
7. Comments for complex schemas

Return ONLY valid JSON (no markdown, actual TypeScript code). Structure:
{
  "success": true,
  "data": {
    "schema": "// Complete schema.ts file with all tables, relationships, indexes",
    "migrations": [
      "// Migration file 001_initial_schema.ts",
      "// Migration file 002_add_indexes.ts"
    ],
    "seedData": "// Sample tournament data for testing",
    "procedures": "// Any stored procedures or complex queries"
  }
}

ARCHITECTURE:
`;

export const INTEGRATION_PROMPT = `You are an Integration Expert. Set up ALL external integrations comprehensively.

Generate:
1. Complete API client initialization
2. Authentication setup
3. Data transformation/mapping
4. Error handling and retries
5. Webhooks if needed
6. Environment variables
7. Testing helpers
8. Type definitions

Return ONLY valid JSON (no markdown, actual code). Structure:
{
  "success": true,
  "data": {
    "services": {
      "googleSheets": "// Complete Google Sheets client with all methods",
      "email": "// Email service (SendGrid/Mailgun)",
      "payment": "// Payment processor (Stripe/PayPal) with complete implementation"
    },
    "environmentVars": ["GOOGLE_SHEETS_API_KEY", "STRIPE_SECRET_KEY", ...],
    "types": "// TypeScript interfaces for all integrations",
    "errorHandling": "// Comprehensive error handling"
  }
}

SPECIFICATION:
`;

export const CONFIG_PROMPT = `You are a Configuration Expert. Generate ALL project configuration files with best practices.

Generate:
1. Complete package.json with all dependencies (dev and prod)
2. TypeScript config optimized for performance
3. Vite config with proper optimizations
4. Tailwind config with custom theme
5. Drizzle config
6. ESLint config
7. Prettier config
8. .env.example with all variables
9. .gitignore

Return ONLY valid JSON (no markdown, actual file contents). Structure:
{
  "success": true,
  "data": {
    "packageJson": { /* Complete package.json object */ },
    "tsconfig": { /* Complete tsconfig.json */ },
    "viteConfig": "// Complete vite.config.ts",
    "tailwindConfig": "// Complete tailwind.config.ts",
    "drizzleConfig": "// Complete drizzle.config.ts",
    "eslintConfig": "// ESLint configuration",
    "prettierConfig": "// Prettier configuration",
    "envExample": "// All environment variables needed"
  }
}

SPECIFICATION:
`;

export const QA_PROMPT = `You are a QA/Code Review Expert. Thoroughly validate and improve generated code.

Analyze all code and:
1. Check TypeScript compilation (catch all type errors)
2. Verify all imports/exports match
3. Check component props are properly typed
4. Ensure error boundaries exist
5. Verify API calls have proper error handling
6. Check for security vulnerabilities
7. Verify performance optimizations
8. Check accessibility compliance
9. Identify missing features
10. Suggest improvements for production

Return ONLY valid JSON (no markdown). Structure:
{
  "success": true,
  "data": {
    "issues": [
      {
        "file": "src/components/Form.tsx",
        "line": 42,
        "severity": "error|warning",
        "issue": "Missing error boundary",
        "suggestion": "Wrap component in ErrorBoundary"
      }
    ],
    "improvements": [
      "Add loading skeleton for better UX",
      "Implement debouncing for search"
    ],
    "missingFeatures": ["Email notifications", "Export to CSV"],
    "overallQuality": "needs-improvement|good|excellent",
    "estimatedCompleteness": "percentage 0-100"
  }
}

GENERATED CODE:
`;

/**
 * Helper function to create prompt with context
 */
export function createPrompt(
  basePrompt: string,
  ...context: (string | object)[]
): string {
  let fullPrompt = basePrompt;
  for (const item of context) {
    const itemStr = typeof item === "string" ? item : JSON.stringify(item, null, 2);
    fullPrompt += "\n\n" + itemStr;
  }
  return fullPrompt;
}

/**
 * Credit-safe prompt builder for Qubrid/DeepSeek (reasoning-heavy model).
 * Uses compact JSON (no indentation) to cut prompt tokens ~30-40%,
 * and instructs concise output to cut completion/reasoning tokens.
 */
export function createCompactPrompt(
  basePrompt: string,
  ...context: (string | object)[]
): string {
  let fullPrompt = basePrompt;
  for (const item of context) {
    const itemStr = typeof item === "string" ? item : JSON.stringify(item);
    fullPrompt += "\n\n" + itemStr;
  }
  return (
    fullPrompt +
    "\n\nReturn ONLY valid JSON. Keep generated code concise (minimal comments, no explanations, no reasoning text in the response)."
  );
}

/**
 * Pick only the architecture slices an agent needs.
 * Handles both flat (mock) and nested (real LLM) arch shapes.
 * Falls back to the full arch if none of the keys are found.
 */
export function sliceArchitecture(arch: any, ...keys: string[]): any {
  if (!arch || typeof arch !== "object") return arch;
  const get = (obj: any, key: string) => {
    if (obj?.[key] !== undefined) return obj[key];
    if (obj?.database?.[key] !== undefined) return obj.database[key];
    if (obj?.client?.src?.[key] !== undefined) return obj.client.src[key];
    if (obj?.client?.[key] !== undefined) return obj.client[key];
    return undefined;
  };
  const out: any = {};
  let found = false;
  for (const k of keys) {
    const v = get(arch, k);
    if (v !== undefined) {
      out[k] = v;
      found = true;
    }
  }
  return found ? out : arch;
}

/**
 * Replace long strings with {chars, head} summaries.
 * Used for QA so the model validates structure, not full code.
 */
export function truncateLongStrings(value: any, headLen = 400): any {
  if (typeof value === "string") {
    return value.length > headLen
      ? { chars: value.length, head: value.substring(0, headLen) }
      : value;
  }
  if (Array.isArray(value)) return value.map((v) => truncateLongStrings(v, headLen));
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = truncateLongStrings(v, headLen);
    return out;
  }
  return value;
}
