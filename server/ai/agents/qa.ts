import { AgentOutput } from "@shared/types";
import { model } from "../client";
import { QA_PROMPT, createPrompt } from "../prompts";
import { createMockQAResponse } from "../mock-agents";

/**
 * QA Agent
 * Validates all generated code for correctness and quality
 * Uses Gemini 2.0 Flash for fast, free code validation
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

    // Create the full prompt with all generated code
    const prompt = createPrompt(QA_PROMPT, allGeneratedFiles);

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
        errors: ["Failed to parse QA validation response"],
      };
    }

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

