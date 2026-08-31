import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { FRONTEND_PROMPT, createPrompt } from "../prompts";
import { createMockFrontendResponse } from "../mock-agents";

/**
 * Frontend Agent
 * Generates React components, pages, and styling
 * Uses Claude API for fast, reliable code generation
 */
export async function frontendAgent(
  spec: any,
  architecture: any
): Promise<AgentOutput> {
  try {
    // Check if using mock agents for testing
    if (process.env.MOCK_AGENTS === "true") {
      console.log("[MOCK] Frontend agent returning mock response");
      return createMockFrontendResponse();
    }

    // Create the full prompt with specification and architecture
    const fullSpec = { specification: spec, architecture };
    const prompt = createPrompt(FRONTEND_PROMPT, fullSpec);

    // Call Claude API
    const parsedResponse = await callClaude(prompt);

    // Validate response structure
    if (!parsedResponse.success) {
      return {
        success: false,
        data: {},
        errors: parsedResponse.errors || ["Frontend code generation failed"],
        warnings: parsedResponse.warnings,
      };
    }

    return {
      success: true,
      data: parsedResponse.data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Frontend agent error:", errorMessage);

    return {
      success: false,
      data: {},
      errors: [`Frontend agent error: ${errorMessage}`],
    };
  }
}

