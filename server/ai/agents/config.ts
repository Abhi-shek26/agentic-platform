import { AgentOutput } from "@shared/types";
import { model } from "../client";
import { CONFIG_PROMPT, createPrompt } from "../prompts";
import { createMockConfigResponse } from "../mock-agents";

/**
 * Configuration Agent
 * Generates configuration files (package.json, tsconfig, vite.config, etc)
 * Uses Gemini 2.0 Flash for fast, free config generation
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

    // Create the full prompt with specification
    const prompt = createPrompt(CONFIG_PROMPT, spec);

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
        errors: ["Failed to parse configuration generation response"],
      };
    }

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

