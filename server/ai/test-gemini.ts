/**
 * Test Claude API Integration
 * Run with: npx tsx server/ai/test-claude.ts
 */

import { specParserAgent } from "./agents/specParser";

async function testClaudeIntegration() {
  console.log("🧪 Testing Claude API Integration...\n");

  // Test specification
  const testSpec = {
    tournamentName: "Spring Chess Championship 2026",
    date: "2026-04-15",
    location: "New York, USA",
    description: "A competitive regional chess tournament",
    pages: ["home", "info", "register", "schedule", "players"],
    colorScheme: "modern",
    integrations: ["google-sheets"],
  };

  console.log("📋 Test Specification:");
  console.log(JSON.stringify(testSpec, null, 2));
  console.log("\n⏳ Calling SpecParser agent with Claude...\n");

  try {
    const result = await specParserAgent(testSpec);

    console.log("✅ Response received!\n");
    console.log("Result:");
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log("\n✅ SpecParser agent works with Claude API!");
      console.log("Validated specification:", result.data.validatedSpec);
    } else {
      console.log("\n❌ SpecParser validation failed");
      console.log("Errors:", result.errors);
    }
  } catch (error) {
    console.error("\n❌ Error testing Claude API:");
    console.error(error);
    process.exit(1);
  }
}

testClaudeIntegration();
