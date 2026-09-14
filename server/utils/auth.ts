import Anthropic from "@anthropic-ai/sdk";
import bcrypt from "bcrypt";
import { TournamentSpecification, AgentOutput } from "@shared/types";

// ============================================================
// PASSWORD HASHING UTILITIES
// ============================================================

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
      displayName?: string;
    }
  }
}

export interface AuthenticatedSession {
  userId: string;
  username: string;
  email: string;
}

// ============================================================
// JWT-LIKE TOKEN MANAGEMENT (for API auth)
// ============================================================

import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export function generateAuthToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ============================================================
// STATELESS SESSION TOKENS (survive container restarts)
// ============================================================
// Replaces the old in-memory token→user Map: every restart wiped all
// sessions (401s) along with all users. Format:
//   base64url("<userId>.<expUnix>") + "." + base64url(HMAC_SHA256(payload))

const b64urlEncode = (buf: Buffer): string =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const b64urlDecode = (s: string): string =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

function sessionSecret(): string {
  return process.env.SESSION_SECRET || "dev-secret-key";
}

export function signSessionToken(userId: string, maxAgeSeconds = 7 * 24 * 3600): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest();
  return `${b64urlEncode(Buffer.from(payload, "utf8"))}.${b64urlEncode(sig)}`;
}

export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const payload = b64urlDecode(parts[0]);
    const dot = payload.lastIndexOf(".");
    if (dot < 0) return null;
    const userId = payload.slice(0, dot);
    const exp = Number(payload.slice(dot + 1));
    if (!userId || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
    const expected = createHmac("sha256", sessionSecret()).update(payload).digest();
    const actual = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    return { userId };
  } catch {
    return null;
  }
}

// ============================================================
// VALIDATION UTILITIES
// ============================================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUsername(username: string): boolean {
  // Username: 3-20 chars, alphanumeric and underscore only
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================
// AUTHENTICATION ERROR CLASSES
// ============================================================

export class AuthenticationError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public field?: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
    this.statusCode = 403;
  }
  statusCode: number;
}
