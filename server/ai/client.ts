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
});

export default { genAI, model };
