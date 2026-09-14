import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { QUBRID_CODE_MODEL } from "../qubrid-client";
import { BACKEND_PROMPT, createCompactPrompt, sliceArchitecture } from "../prompts";
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

    // Slim context: backend only needs endpoints + tables (credit-safe)
    const archSlim = sliceArchitecture(architecture, "apiEndpoints", "tables");
    const prompt = createCompactPrompt(BACKEND_PROMPT, {
      specification: spec,
      architecture: archSlim,
    });

    // Coder model for code output (concise) + 32k cap (credit-tracked)
    const parsedResponse = await callClaude(prompt, { temperature: 0.3, maxTokens: 32000, model: QUBRID_CODE_MODEL });

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

