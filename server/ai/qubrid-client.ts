import { config } from "dotenv";

// Ensure env is loaded when this module is imported standalone
config();

const QUBRID_BASE_URL =
  process.env.QUBRID_BASE_URL?.trim() || "https://platform.qubrid.com/v1";
// Planning model (spec/architect/integration/config/qa): strong reasoner.
const QUBRID_MODEL =
  process.env.QUBRID_MODEL?.trim() || "deepseek-ai/DeepSeek-V4-Flash";
// Code model (frontend/backend/database): concise coder, ~3-5x fewer tokens.
export const QUBRID_CODE_MODEL =
  process.env.QUBRID_CODE_MODEL?.trim() || "Qwen/Qwen3-Coder-Flash";

function getKey(): string {
  const key = process.env.QUBRID_API_KEY?.trim();
  if (!key) throw new Error("QUBRID_API_KEY is not set");
  return key;
}

/**
 * Minimal OpenAI-compatible chat call for Qubrid.
 * Credit-safe defaults: low max_tokens, temperature 0.7.
 * Returns raw text content (caller parses JSON).
 */
export async function callQubridRaw(
  prompt: string,
  opts: { maxTokens?: number; temperature?: number; system?: string; model?: string; jsonMode?: boolean } = {}
): Promise<{ text: string; usage?: any }> {
  const key = getKey();
  const max_tokens = opts.maxTokens ?? 16000;
  const temperature = opts.temperature ?? 0.7;
  const model = opts.model?.trim() || QUBRID_MODEL;

  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${QUBRID_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens,
      temperature,
      stream: false,
      // Ask OpenAI-compatible backends for strict JSON. If a backend rejects
      // this field, the caller retries without it (see callQubrid fallback).
      ...(opts.jsonMode === false ? {} : { response_format: { type: "json_object" } }),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Qubrid API error ${res.status}: ${body.substring(0, 500)}`
    );
  }

  const data: any = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const usage = data?.usage;

  if (usage) {
    console.log(
      `[Qubrid] tokens prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens} model=${model}`
    );
  }

  if (!text) throw new Error("Empty response from Qubrid");
  return { text, usage };
}

/**
 * Extract the first complete JSON object from text, tolerating
 * leading/trailing prose and markdown fences. Brace-aware with
 * string/escape handling so code strings containing { } don't break it.
 */
function extractFirstJsonObject(text: string): string | null {
  const cleaned = text.replace(/```json|```/g, "");
  const start = cleaned.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return cleaned.substring(start, i + 1);
      }
    }
  }
  return null; // truncated — no complete object
}
export async function callQubrid(
  prompt: string,
  maxTokens = 16000,
  temperature = 0.7,
  model?: string
): Promise<any> {
  const effectiveModel = model?.trim() || QUBRID_MODEL;
  console.log(
    `[Qubrid] Calling ${effectiveModel} prompt=${prompt.length} chars maxTokens=${maxTokens} temp=${temperature}`
  );
  const { text } = await callQubridRaw(prompt, { maxTokens, temperature, model: effectiveModel }).catch(
    async (err) => {
      // If the backend rejects response_format, retry once as plain chat.
      if (err instanceof Error && /response_format|json_object/i.test(err.message)) {
        console.warn("[Qubrid] response_format unsupported, retrying without it");
        return callQubridRaw(prompt, { maxTokens, temperature, model: effectiveModel, jsonMode: false });
      }
      throw err;
    }
  );

  const candidate = extractFirstJsonObject(text);
  if (!candidate) {
    console.error("[Qubrid] No complete JSON object, head:", text.substring(0, 300));
    console.error("[Qubrid] tail:", text.substring(Math.max(0, text.length - 300)));
    throw new Error("No complete JSON in Qubrid response (likely truncated — raise maxTokens)");
  }
  // Lenient parse ladder: raw → trailing-comma fix → control-char strip →
  // both. Reasoning models often leak literal newlines/tabs inside strings
  // or trailing commas; raw control chars are never structural in JSON, so
  // replacing them with spaces is always safe.
  const noTrailingCommas = candidate.replace(/,(\s*[}\]])/g, "$1");
  const stripped = candidate.replace(/[\u0000-\u001F]+/g, " ");
  const attempts: string[] = [
    candidate,
    noTrailingCommas,
    stripped,
    stripped.replace(/,(\s*[}\]])/g, "$1"),
  ];
  const lastBrace = candidate.lastIndexOf("}");
  if (lastBrace > 0 && lastBrace < candidate.length - 1) {
    attempts.push(candidate.substring(0, lastBrace + 1));
  }
  let lastError: unknown = null;
  for (const text of attempts) {
    try {
      return JSON.parse(text);
    } catch (e) {
      lastError = e;
    }
  }
  if (lastError instanceof Error) {
    const m = /position (\d+)/.exec(lastError.message);
    if (m) {
      const pos = Number(m[1]);
      console.error(
        "[Qubrid] JSON parse failed near:",
        JSON.stringify(candidate.substring(Math.max(0, pos - 200), pos + 200))
      );
    } else {
      console.error(
        "[Qubrid] JSON parse failed, tail:",
        candidate.substring(Math.max(0, candidate.length - 300))
      );
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Invalid JSON from Qubrid");
}

/**
 * One tiny cheap connectivity check (~50 tokens). Use sparingly.
 */
export async function testQubridConnection(): Promise<void> {
  const { text } = await callQubridRaw('Return exactly this JSON: {"success": true}', {
    maxTokens: 50,
    temperature: 0,
  });
  if (!text.includes('"success"')) throw new Error("Qubrid test failed");
  console.log("[Qubrid] ✓ Connection successful");
}

export const qubridConfig = { get baseUrl() { return QUBRID_BASE_URL; }, get model() { return QUBRID_MODEL; } };
