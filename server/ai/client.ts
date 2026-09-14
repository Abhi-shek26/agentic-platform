import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { callQubrid } from "./qubrid-client";

// Load environment variables
config();

const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();

export const client = anthropicKey
  ? new Anthropic({ apiKey: anthropicKey })
  : null;

/**
 * Call LLM with a prompt and return parsed JSON response.
 * Credit-safe routing:
 *  1. Qubrid (DeepSeek etc.) if QUBRID_API_KEY is set — preferred, cheap.
 *  2. Claude if ANTHROPIC_API_KEY is set.
 * Agents import this as callClaude so no agent rewrites are needed.
 */
export async function callClaude(
  prompt: string,
  opts: { maxTokens?: number; temperature?: number; model?: string } = {}
): Promise<any> {
  if (process.env.QUBRID_API_KEY?.trim()) {
    const envCap = Number(process.env.QUBRID_MAX_TOKENS ?? 0);
    return callQubrid(
      prompt,
      opts.maxTokens ?? (envCap > 0 ? envCap : 16000),
      opts.temperature ?? 0.7,
      opts.model
    );
  }

  if (!client) {
    throw new Error(
      "No LLM key set. Set QUBRID_API_KEY (preferred) or ANTHROPIC_API_KEY."
    );
  }

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
