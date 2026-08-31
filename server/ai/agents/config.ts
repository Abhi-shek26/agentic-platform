import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { CONFIG_PROMPT, createPrompt } from "../prompts";
import { createMockConfigResponse } from "../mock-agents";

/**
 * Configuration Agent
 * Generates configuration files (package.json, tsconfig, vite.config, etc)
 * Uses Claude API for fast, reliable config generation
 */
export async function configAgent(
  spec: any
): Promise<AgentOutput> {
  try {
    // Check if using mock agents for testing
    if (process.env.MOCK_AGENTS === "true") {
      console.log("[MOCK] Config agent returning mock response");
      return createMockConfigResponse();
    }

    // Create the full prompt with specification
    const prompt = createPrompt(CONFIG_PROMPT, spec);

    // Call Claude API
    const parsedResponse = await callClaude(prompt);

    // Validate response structure
    if (!parsedResponse.success) {
      return {
        success: false,
        data: {},
        errors: parsedResponse.errors || ["Configuration generation failed"],
        warnings: parsedResponse.warnings,
      };
    }

    return {
      success: true,
      data: parsedResponse.data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Config agent error:", errorMessage);

    return {
      success: false,
      data: {},
      errors: [`Config agent error: ${errorMessage}`],
    };
  }
}

