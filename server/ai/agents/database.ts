import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { DATABASE_PROMPT, createPrompt } from "../prompts";
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

    // Create the full prompt with specification and architecture
    const fullSpec = { specification: spec, architecture };
    const prompt = createPrompt(DATABASE_PROMPT, fullSpec);

    // Call Claude API
    const parsedResponse = await callClaude(prompt);

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

