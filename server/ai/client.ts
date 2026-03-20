import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";

// Load environment variables
config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY environment variable is not set. Get a free API key from https://ai.google.dev/"
  );
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Gemini 2.0 Flash model - optimized for fast code generation
 * This is the latest and fastest Gemini model
 */
export const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
  },
});

/**
 * Call Gemini API with a prompt and return parsed JSON response
 * @param prompt The full prompt including context and user input
 * @returns Parsed JSON response from Gemini
 */
export async function callGemini(prompt: string): Promise<any> {
  try {
    console.log(`[Gemini] Calling API with prompt length: ${prompt.length}`);

    const result = await model.generateContent([
      {
        text: prompt,
      },
    ]);

    if (!result.response) {
      throw new Error("No response from Gemini");
    }

    const responseText = result.response.text();
    console.log(`[Gemini] Received response (${responseText.length} chars)`);

    // Extract JSON from the response (handles markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Gemini] Response text:", responseText.substring(0, 500));
      throw new Error("No JSON found in Gemini response");
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    console.log("[Gemini] ✓ Successfully parsed response");

    return parsedResponse;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[Gemini] Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Test the Gemini connection
 */
export async function testGeminiConnection(): Promise<void> {
  try {
    console.log("[Gemini] Testing connection...");
    const testPrompt = "Return this JSON: {\"success\": true, \"test\": \"connection\"}";
    const result = await callGemini(testPrompt);

    if (result.success) {
      console.log("[Gemini] ✓ Connection successful");
    }
  } catch (error) {
    console.error("[Gemini] ✗ Connection test failed:", error);
    throw error;
  }
}

export default { genAI, model, callGemini, testGeminiConnection };
