import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { SPEC_PARSER_PROMPT, createCompactPrompt } from "../prompts";
import { createMockSpecParserResponse } from "../mock-agents";

/**
 * Specification Parser Agent
 * Validates user input and structures it for code generation
 * Uses Claude API for processing
 * Can use mock responses for testing (set MOCK_AGENTS=true in .env)
 */
export async function specParserAgent(
  specification: any
): Promise<AgentOutput> {
  try {
    // Check if using mock agents for testing
    if (process.env.MOCK_AGENTS === "true") {
      console.log("[MOCK] SpecParser agent returning mock response");
      return createMockSpecParserResponse();
    }

    // Compact prompt + low temperature (credit-safe for reasoning models)
    const prompt = createCompactPrompt(SPEC_PARSER_PROMPT, specification);

    // Call LLM API
    const parsedResponse = await callClaude(prompt, { temperature: 0.3 });

    // Validate response structure
    if (!parsedResponse.success) {
      return {
        success: false,
        data: {},
        errors: parsedResponse.errors || ["Specification validation failed"],
        warnings: parsedResponse.warnings,
      };
    }

    return {
      success: true,
      data: {
        validatedSpec: parsedResponse.validatedSpec,
        errors: parsedResponse.errors || [],
        warnings: parsedResponse.warnings || [],
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("SpecParser agent error:", errorMessage);

    return {
      success: false,
      data: {},
      errors: [`SpecParser error: ${errorMessage}`],
    };
  }
}

