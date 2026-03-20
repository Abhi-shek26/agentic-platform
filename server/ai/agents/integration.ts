import { AgentOutput } from "@shared/types";
import { model } from "../client";
import { INTEGRATION_PROMPT, createPrompt } from "../prompts";
import { createMockIntegrationResponse } from "../mock-agents";

/**
 * Integration Agent
 * Sets up external API integrations and configurations
 * Uses Gemini 2.0 Flash for fast, free integration setup
 */
export async function integrationAgent(
  spec: any
): Promise<AgentOutput> {
  try {
    // Check if using mock agents for testing
    if (process.env.MOCK_AGENTS === "true") {
      console.log("[MOCK] Integration agent returning mock response");
      return createMockIntegrationResponse();
    }

    // Create the full prompt with specification
    const prompt = createPrompt(INTEGRATION_PROMPT, spec);

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
        errors: ["Failed to parse integration setup response"],
      };
    }

    // Validate response structure
    if (!parsedResponse.success) {
      return {
        success: false,
        data: {},
        errors: parsedResponse.errors || ["Integration setup failed"],
        warnings: parsedResponse.warnings,
      };
    }

    return {
      success: true,
      data: parsedResponse.data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Integration agent error:", errorMessage);

    return {
      success: false,
      data: {},
      errors: [`Integration agent error: ${errorMessage}`],
    };
  }
}

