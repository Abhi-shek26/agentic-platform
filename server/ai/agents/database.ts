import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { QUBRID_CODE_MODEL } from "../qubrid-client";
import { DATABASE_PROMPT, createCompactPrompt, sliceArchitecture } from "../prompts";
import { createMockDatabaseResponse } from "../mock-agents";

/**
 * Database Agent
 * Generates Drizzle ORM schema and migrations
 * Uses Claude API for fast, reliable schema generation
 */
export async function databaseAgent(
  spec: any,
  architecture: any
): Promise<AgentOutput> {
  try {
    // Check if using mock agents for testing
    if (process.env.MOCK_AGENTS === "true") {
      console.log("[MOCK] Database agent returning mock response");
      return createMockDatabaseResponse();
    }

    // Slim context: database agent only needs tables (credit-safe)
    const archSlim = sliceArchitecture(architecture, "tables", "database");
    const prompt = createCompactPrompt(DATABASE_PROMPT, {
      specification: spec,
      architecture: archSlim,
    });

    // Coder model for schema output (concise) + 32k cap (credit-tracked)
    const parsedResponse = await callClaude(prompt, { temperature: 0.3, maxTokens: 32000, model: QUBRID_CODE_MODEL });

    // Validate response structure
    if (!parsedResponse.success) {
      return {
        success: false,
        data: {},
        errors: parsedResponse.errors || ["Database schema generation failed"],
        warnings: parsedResponse.warnings,
      };
    }

    return {
      success: true,
      data: parsedResponse.data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Database agent error:", errorMessage);

    return {
      success: false,
      data: {},
      errors: [`Database agent error: ${errorMessage}`],
    };
  }
}

