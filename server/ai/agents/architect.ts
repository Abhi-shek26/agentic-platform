import { AgentOutput } from "@shared/types";
import { model } from "../client";
import { ARCHITECT_PROMPT, createPrompt } from "../prompts";
import { createMockArchitectResponse } from "../mock-agents";

/**
 * Architect Agent
 * Designs the project structure, folder layout, and component hierarchy
 * Uses Gemini 2.0 Flash for fast, free design generation
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

