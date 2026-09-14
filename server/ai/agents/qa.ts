import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { QA_PROMPT, createCompactPrompt, truncateLongStrings } from "../prompts";
import { createMockQAResponse } from "../mock-agents";

/**
 * QA Agent
 * Validates all generated code for correctness and quality
 * Uses Claude API for fast, reliable code validation
 */
export async function qaAgent(
  allGeneratedFiles: any
): Promise<AgentOutput> {
  try {
    // Check if using mock agents for testing
    if (process.env.MOCK_AGENTS === "true") {
      console.log("[MOCK] QA agent returning mock response");
      return createMockQAResponse();
    }

    // Summarized files only (full code would blow the token budget)
    const prompt = createCompactPrompt(QA_PROMPT, truncateLongStrings(allGeneratedFiles));

    // Call LLM API
    const parsedResponse = await callClaude(prompt, { temperature: 0.2 });

    // Validate response structure
    if (!parsedResponse.success) {
      return {
        success: false,
        data: {},
        errors: parsedResponse.errors || ["QA validation failed"],
        warnings: parsedResponse.warnings,
      };
    }

    return {
      success: true,
      data: parsedResponse.data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("QA agent error:", errorMessage);

    return {
      success: false,
      data: {},
      errors: [`QA agent error: ${errorMessage}`],
    };
  }
}

