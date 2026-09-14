import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { ARCHITECT_PROMPT, createCompactPrompt } from "../prompts";
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

    // Compact prompt + low temperature (credit-safe for reasoning models)
    const prompt = createCompactPrompt(ARCHITECT_PROMPT, spec);

    // Call LLM API — 32k cap: arch JSON (folderStructure + 5 tables + endpoints)
    // routinely exceeds 16k completion on reasoning models (DeepSeek-V4-Flash
    // counts reasoning + output against max_tokens → truncated JSON → stuck at 15%).
    // Low temperature for deterministic, syntactically valid JSON.
    const parsedResponse = await callClaude(prompt, { temperature: 0.1, maxTokens: 32000 });

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

