import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";

// Load environment variables
config();

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error(
    "ANTHROPIC_API_KEY environment variable is not set. Get a free API key from https://console.anthropic.com"
  );
}

export const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Call Claude API with a prompt and return parsed JSON response
 * @param prompt The full prompt including context and user input
 * @returns Parsed JSON response from Claude
 */
export async function callClaude(prompt: string): Promise<any> {
  try {
    console.log(`[Claude] Calling API with prompt length: ${prompt.length}`);

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    if (!message.content || message.content.length === 0) {
      throw new Error("No response from Claude");
    }

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    console.log(`[Claude] Received response (${responseText.length} chars)`);

    // Extract JSON from the response (handles markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Claude] Response text:", responseText.substring(0, 500));
      throw new Error("No JSON found in Claude response");
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    console.log("[Claude] ✓ Successfully parsed response");

    return parsedResponse;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[Claude] Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Test the Claude connection
 */
export async function testClaudeConnection(): Promise<void> {
  try {
    console.log("[Claude] Testing connection...");
    const testPrompt = "Return this JSON: {\"success\": true, \"test\": \"connection\"}";
    const result = await callClaude(testPrompt);

    if (result.success) {
      console.log("[Claude] ✓ Connection successful");
    }
  } catch (error) {
    console.error("[Claude] ✗ Connection test failed:", error);
    throw error;
  }
}

export default { client, callClaude, testClaudeConnection };
