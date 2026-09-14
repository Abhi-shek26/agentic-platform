import { AgentOutput } from "@shared/types";
import { callClaude } from "../client";
import { QUBRID_CODE_MODEL } from "../qubrid-client";
import { FRONTEND_PROMPT, createCompactPrompt, sliceArchitecture } from "../prompts";
import { createMockFrontendResponse } from "../mock-agents";

/**
 * Minimum pages for a non-thin result. The orchestrator retries once (real
 * LLM only) when the output is thinner than this.
 */
export const FRONTEND_MIN_PAGES = Number(process.env.FRONTEND_MIN_PAGES ?? 3);

/** Pure predicate — free to unit-test: is this frontend output too thin? */
export function isThinFrontend(data: any, min = FRONTEND_MIN_PAGES): boolean {
  const pages = Array.isArray(data?.pages) ? data.pages : [];
  return pages.length < min;
}

/**
 * Frontend Agent
 * Generates React components, pages, and styling
 * Uses Claude API for fast, reliable code generation
 */
export async function frontendAgent(
  spec: any,
  architecture: any,
  opts: { retryHint?: string } = {}
): Promise<AgentOutput> {
  try {
    // Check if using mock agents for testing
    if (process.env.MOCK_AGENTS === "true") {
      console.log("[MOCK] Frontend agent returning mock response");
      return createMockFrontendResponse();
    }

    // Slim context: frontend only needs pages + structure (credit-safe)
    const archSlim = sliceArchitecture(architecture, "pages", "folderStructure");
    const basePrompt = createCompactPrompt(FRONTEND_PROMPT, {
      specification: spec,
      architecture: archSlim,
    });
    const prompt = opts.retryHint ? `${basePrompt}\n\nRETRY INSTRUCTION: ${opts.retryHint}` : basePrompt;

    // Coder model for code output (concise) + 32k cap (credit-tracked)
    const parsedResponse = await callClaude(prompt, { temperature: 0.3, maxTokens: 32000, model: QUBRID_CODE_MODEL });

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

