import { AgentOutput } from "@shared/types";
import { callGemini } from "../client";
import { ARCHITECT_PROMPT, createPrompt } from "../prompts";
import { createMockArchitectResponse } from "../mock-agents";

/**
 * Architect Agent
 * Designs the project structure, folder layout, and component hierarchy
 * Uses Claude API for design generation
 */
export async function architectAgent(
  spec: any
): Promise<AgentOutput> {
  try {
    // Check if using mock agents for testing
    if (process.env.MOCK_AGENTS === "true") {
      console.log("[MOCK] Architect agent returning mock response");
      return createMockArchitectResponse();
    }

    // Create the full prompt with specification
    const prompt = createPrompt(ARCHITECT_PROMPT, spec);

    // Call Claude API
    const parsedResponse = await callGemini(prompt);
        data: {},
        errors: ["Failed to parse architecture design response"],
      };
    }

    // Validate response structure
    if (!parsedResponse.success) {
      return {
        success: false,
        data: {},
        errors: parsedResponse.errors || ["Architecture design failed"],
        warnings: parsedResponse.warnings,
      };
    }

    return {
      success: true,
      data: parsedResponse.data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Architect agent error:", errorMessage);

    return {
      success: false,
      data: {},
      errors: [`Architect agent error: ${errorMessage}`],
    };
  }
}

