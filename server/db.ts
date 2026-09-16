import { Pool } from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

/**
 * PostgreSQL connection + schema bootstrap.
 *
 * The app historically ran on in-memory Maps, so every container restart
 * wiped users/projects/sessions (login failed with "Invalid credentials"
 * until the user signed up again). This module persists everything in the
 * compose `postgres` service instead.
 */

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    // Neon/Supabase free tiers require SSL. pg respects ?sslmode=require in the URL,
    // but pooled Neon URLs sometimes omit it — force ssl when host matches.
    const needsSsl =
      /sslmode=require/i.test(connectionString) ||
      /neon\.tech|supabase\.co|render\.com/i.test(connectionString);
    pool = new Pool({
      connectionString,
      max: 10,
      ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    pool.on("error", (err) => console.error("[DB] Pool error:", err));
  }
  return pool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!db) db = drizzle(getPool(), { schema });
  return db;
}

const DDL_STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
  `DO $$ BEGIN CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE project_status AS ENUM ('draft', 'generating', 'generated', 'deployed', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE deployment_status AS ENUM ('pending', 'building', 'live', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE generation_status AS ENUM ('queued', 'processing', 'completed', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password TEXT,
    display_name VARCHAR(255),
    avatar TEXT,
    subscription_tier subscription_tier DEFAULT 'free',
    generation_quota INTEGER DEFAULT 5,
    generation_used INTEGER DEFAULT 0,
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  // NOTE: no FK on organizations.owner → users: none needed.
  `CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  // NOTE: organization_id intentionally has NO FK — the app uses the user id
  // as the organization id for personal ownership tracking.
  `CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    status project_status DEFAULT 'draft',
    specification JSONB NOT NULL,
    generation_metadata JSONB,
    generated_code_path VARCHAR(500),
    git_repo_url VARCHAR(500),
    hosted_url VARCHAR(500),
    deployment_status deployment_status DEFAULT 'pending',
    preview_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status generation_status DEFAULT 'queued',
    current_agent VARCHAR(100),
    progress_percentage INTEGER DEFAULT 0,
    error_message TEXT,
    logs JSONB DEFAULT '[]',
    started_at TIMESTAMP,
    completed_at TIMESTAMP
  )`,
];

/**
 * Create extension/types/tables if missing. Retries while Postgres is
 * still starting (health-gated, but be liberal). Throws after exhausting
 * retries — crashing loud beats serving 500s on every auth call.
 */
export async function ensureDatabase(maxAttempts = 20, delayMs = 3000): Promise<void> {
  const client = getPool();
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      for (const stmt of DDL_STATEMENTS) {
        await client.query(stmt);
      }
      console.log("[DB] ✓ PostgreSQL schema ready");
      return;
    } catch (err) {
      lastError = err;
      console.warn(`[DB] Schema bootstrap attempt ${attempt}/${maxAttempts} failed, retrying...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`[DB] Schema bootstrap failed: ${lastError instanceof Error ? lastError.message : lastError}`);
}
