import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  boolean,
  serial,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// ENUMS
// ============================================================

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "pro",
  "enterprise",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "generating",
  "generated",
  "deployed",
  "failed",
]);

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending",
  "building",
  "live",
  "failed",
]);

export const generationStatusEnum = pgEnum("generation_status", [
  "queued",
  "processing",
  "completed",
  "failed",
]);

export const componentTypeEnum = pgEnum("component_type", [
  "page",
  "section",
  "widget",
  "layout",
]);

// ============================================================
// USERS TABLE
// ============================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 100 }).notNull().unique(),
    password: text("password"), // null if using OAuth
    displayName: varchar("display_name", { length: 255 }),
    avatar: text("avatar"), // URL to profile picture
    subscriptionTier: subscriptionTierEnum("subscription_tier").default("free"),
    generationQuota: integer("generation_quota").default(5), // Free tier: 5 generations/month
    generationUsed: integer("generation_used").default(0),
    oauthProvider: varchar("oauth_provider", { length: 50 }), // 'github', 'google', etc
    oauthId: varchar("oauth_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    usernameIdx: uniqueIndex("users_username_idx").on(table.username),
    oauthIdx: uniqueIndex("users_oauth_idx").on(table.oauthProvider, table.oauthId),
  })
);

// ============================================================
// ORGANIZATIONS TABLE
// ============================================================

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("organizations_slug_idx").on(table.slug),
  })
);

// ============================================================
// PROJECTS TABLE (Generated Tournament Websites)
// ============================================================

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: text("description"),
    status: projectStatusEnum("status").default("draft"),
    specification: jsonb("specification").notNull(), // Full user input
    generationMetadata: jsonb("generation_metadata"), // Generation details
    generatedCodePath: varchar("generated_code_path", { length: 500 }), // S3/blob path
    gitRepoUrl: varchar("git_repo_url", { length: 500 }),
    hostedUrl: varchar("hosted_url", { length: 500 }), // Platform hosted URL
    deploymentStatus: deploymentStatusEnum("deployment_status").default("pending"),
    previewUrl: varchar("preview_url", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    orgSlugIdx: uniqueIndex("projects_org_slug_idx").on(
      table.organizationId,
      table.slug
    ),
  })
);

// ============================================================
// GENERATION JOBS TABLE
// ============================================================

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: generationStatusEnum("status").default("queued"),
    currentAgent: varchar("current_agent", { length: 100 }), // Which agent is running
    progressPercentage: integer("progress_percentage").default(0),
    errorMessage: text("error_message"),
    logs: jsonb("logs").default([]), // Array of log entries
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => ({
    projectIdIdx: uniqueIndex("generation_jobs_project_id_idx").on(table.projectId),
  })
);

// ============================================================
// GENERATION HISTORY TABLE
// ============================================================

export const generationHistory = pgTable(
  "generation_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    specificationDiff: jsonb("specification_diff"), // What changed
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
    regeneratedFromVersion: integer("regenerated_from_version"),
  },
  (table) => ({
    projectVersionIdx: uniqueIndex("generation_history_project_version_idx").on(
      table.projectId,
      table.version
    ),
  })
);

// ============================================================
// CUSTOM COMPONENTS TABLE
// ============================================================

export const customComponents = pgTable(
  "custom_components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    componentType: componentTypeEnum("component_type"),
    code: text("code").notNull(),
    metadata: jsonb("metadata"), // Component metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

// ============================================================
// GENERATION TEMPLATES TABLE
// ============================================================

export const generationTemplates = pgTable(
  "generation_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description"),
    sampleSpecification: jsonb("sample_specification"), // Template spec
    isPublic: boolean("is_public").default(false),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// ============================================================
// ZODSCHEMAS FOR VALIDATION
// ============================================================

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  password: true,
  displayName: true,
});

export const selectUserSchema = createSelectSchema(users);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

// Project schemas
export const insertProjectSchema = createInsertSchema(projects).pick({
  organizationId: true,
  name: true,
  slug: true,
  description: true,
  specification: true,
});

export const selectProjectSchema = createSelectSchema(projects);

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = z.infer<typeof selectProjectSchema>;
