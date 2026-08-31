import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { BACKEND_PROMPT, createPrompt } from "../prompts";
import { createMockBackendResponse } from "../mock-agents";

/**
 * Backend Agent
 * Generates Express routes, middleware, and business logic
 * Uses Claude API for fast, reliable code generation
 */
export async function backendAgent(
  spec: any,
  architecture: any
): Promise<AgentOutput> {
  try {
    // Check if using mock agents for testing
    if (process.env.MOCK_AGENTS === "true") {
      console.log("[MOCK] Backend agent returning mock response");
      return createMockBackendResponse();
    }

    // Create the full prompt with specification and architecture
    const fullSpec = { specification: spec, architecture };
    const prompt = createPrompt(BACKEND_PROMPT, fullSpec);

    // Call Claude API
    const parsedResponse = await callClaude(prompt);

    // Validate response structure
    if (!parsedResponse.success) {
      return {
        success: false,
        data: {},
        errors: parsedResponse.errors || ["Backend code generation failed"],
        warnings: parsedResponse.warnings,
      };
    }

    return {
      success: true,
      data: parsedResponse.data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Backend agent error:", errorMessage);

    return {
      success: false,
      data: {},
      errors: [`Backend agent error: ${errorMessage}`],
    };
  }
}

