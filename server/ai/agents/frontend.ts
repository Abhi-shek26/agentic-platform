import { AgentOutput } from "@shared/types";
import { model } from "../client";
import { FRONTEND_PROMPT, createPrompt } from "../prompts";
import { createMockFrontendResponse } from "../mock-agents";

/**
 * Frontend Agent
 * Generates React components, pages, and styling configuration
 * Uses Gemini 2.0 Flash for fast, free code generation
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

    // Call Gemini API
    const result = await model.generateContent([{ text: prompt }]);
    const responseText = result.response.text();

    // Parse JSON response
    let parsedResponse;
    try {
      // Extract JSON from response (in case there's markdown formatting)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      parsedResponse = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return {
        success: false,
        data: {},
        errors: ["Failed to parse frontend code generation response"],
      };
    }

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

