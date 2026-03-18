import { AgentOutput } from "@shared/types";
import { model } from "../client";
import { SPEC_PARSER_PROMPT, createPrompt } from "../prompts";
import { createMockSpecParserResponse } from "../mock-agents";

/**
 * Specification Parser Agent
 * Validates user input and structures it for code generation
 * Uses Gemini 2.0 Flash model for fast, free processing
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

    // Create the full prompt with user specification
    const prompt = createPrompt(SPEC_PARSER_PROMPT, specification);

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
        errors: ["Failed to parse specification validation response"],
      };
    }

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

