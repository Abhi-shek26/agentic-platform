import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { INTEGRATION_PROMPT, createCompactPrompt } from "../prompts";
import { createMockIntegrationResponse } from "../mock-agents";

/**
 * Integration Agent
 * Sets up external API integrations and configurations
 * Uses Claude API for fast, reliable integration setup
 */
export async function integrationAgent(
  spec: any
): Promise<AgentOutput> {
  try {
    // Check if using mock agents for testing
    if (process.env.MOCK_AGENTS === "true") {
      console.log("[MOCK] Integration agent returning mock response");
      return createMockIntegrationResponse();
    }

    // Compact prompt + low temperature (credit-safe for reasoning models)
    const prompt = createCompactPrompt(INTEGRATION_PROMPT, spec);

    // Call LLM API
    const parsedResponse = await callClaude(prompt, { temperature: 0.3 });

    // Validate response structure
    if (!parsedResponse.success) {
      return {
        success: false,
        data: {},
        errors: parsedResponse.errors || ["Integration setup failed"],
        warnings: parsedResponse.warnings,
      };
    }

    return {
      success: true,
      data: parsedResponse.data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Integration agent error:", errorMessage);

    return {
      success: false,
      data: {},
      errors: [`Integration agent error: ${errorMessage}`],
    };
  }
}

