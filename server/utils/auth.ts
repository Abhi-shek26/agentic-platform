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

import { createHash, randomBytes } from "crypto";

export function generateAuthToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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
