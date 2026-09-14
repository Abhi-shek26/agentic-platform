import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { QUBRID_CODE_MODEL } from "../qubrid-client";
import { CONFIG_PROMPT, createCompactPrompt } from "../prompts";
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

    // Compact prompt + low temperature (credit-safe for reasoning models)
    const prompt = createCompactPrompt(CONFIG_PROMPT, spec);

    // Call LLM API (coder model: config files are code output)
    const parsedResponse = await callClaude(prompt, { temperature: 0.3, maxTokens: 32000, model: QUBRID_CODE_MODEL });

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

