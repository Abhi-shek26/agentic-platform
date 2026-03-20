import { specParserAgent } from "./agents/specParser";
import { architectAgent } from "./agents/architect";
import { frontendAgent } from "./agents/frontend";
import { backendAgent } from "./agents/backend";
import { databaseAgent } from "./agents/database";
import { integrationAgent } from "./agents/integration";
import { configAgent } from "./agents/config";
import { qaAgent } from "./agents/qa";

/**
 * Main Orchestrator Agent
 * Coordinates all specialized agents to generate a complete tournament website
 * Sequential + Parallel execution with progress tracking
 */
export async function orchestratorAgent(
  specification: any,
  onProgress: (update: {
    currentAgent?: string;
    percentage?: number;
    message?: string;
    agents?: Array<{ name: string; status: string }>;
  }) => void
): Promise<any> {
  console.log("🎯 Starting orchestration for:", specification.tournamentName);

  const agents = [
    { name: "SpecParser", status: "pending" },
    { name: "Architect", status: "pending" },
    { name: "Frontend", status: "pending" },
    { name: "Backend", status: "pending" },
    { name: "Database", status: "pending" },
    { name: "Integration", status: "pending" },
    { name: "Config", status: "pending" },
    { name: "QA", status: "pending" },
  ];

  try {
    // STEP 1: Spec Parser (5%)
    agents[0].status = "processing";
    onProgress({
      currentAgent: "SpecParser",
      percentage: 5,
      message: "Parsing and validating specification...",
      agents: agents,
    });

    const parsedSpec = await specParserAgent(specification);
    if (!parsedSpec.success) {
      throw new Error(`Spec parsing failed: ${parsedSpec.errors?.join(", ")}`);
    }
    agents[0].status = "completed";

    // STEP 2: Architect (15%)
    agents[1].status = "processing";
    onProgress({
      currentAgent: "Architect",
      percentage: 15,
      message: "Designing project architecture...",
      agents: agents,
    });

    const architecture = await architectAgent(parsedSpec.data.validatedSpec);
    if (!architecture.success) {
      throw new Error(`Architecture design failed: ${architecture.errors?.join(", ")}`);
    }
    agents[1].status = "completed";

    // STEP 3-5: Code Generation (Frontend, Backend, Database) in PARALLEL (60%)
    agents[2].status = "processing";
    agents[3].status = "processing";
    agents[4].status = "processing";
    onProgress({
      currentAgent: "Frontend/Backend/Database",
      percentage: 30,
      message: "Generating frontend, backend, and database code in parallel...",
      agents: agents,
    });

    const [frontend, backend, database] = await Promise.all([
      frontendAgent(parsedSpec.data.validatedSpec, architecture.data),
      backendAgent(parsedSpec.data.validatedSpec, architecture.data),
      databaseAgent(parsedSpec.data.validatedSpec, architecture.data),
    ]);

    agents[2].status = "completed";
    agents[3].status = "completed";
    agents[4].status = "completed";

    // STEP 6: Integrations (70%)
    agents[5].status = "processing";
    onProgress({
      currentAgent: "Integration",
      percentage: 60,
      message: "Setting up external integrations...",
      agents: agents,
    });

    const integration = await integrationAgent(parsedSpec.data.validatedSpec);
    if (!integration.success) {
      console.warn("Integration setup had issues, continuing with defaults");
    }
    agents[5].status = "completed";

    // STEP 7: Config (80%)
    agents[6].status = "processing";
    onProgress({
      currentAgent: "Config",
      percentage: 70,
      message: "Generating configuration files...",
      agents: agents,
    });

    const config = await configAgent(parsedSpec.data.validatedSpec);
    if (!config.success) {
      throw new Error(`Config generation failed: ${config.errors?.join(", ")}`);
    }
    agents[6].status = "completed";

    // STEP 8: QA (90%)
    agents[7].status = "processing";
    onProgress({
      currentAgent: "QA",
      percentage: 85,
      message: "Validating generated code...",
      agents: agents,
    });

    // Prepare all files for QA validation
    const allGeneratedFiles = {
      frontend: frontend.data?.components || [],
      backend: backend.data?.routes || [],
      database: database.data?.schema || "",
      config: config.data || {},
    };

    const qa = await qaAgent(allGeneratedFiles);
    if (!qa.success) {
      console.warn("QA validation found issues but continuing");
    }
    agents[7].status = "completed";

    // FINAL: Complete (100%)
    onProgress({
      currentAgent: "Complete",
      percentage: 100,
      message: "Website generation complete!",
      agents: agents,
    });

    console.log("✅ Orchestration completed successfully");

    return {
      success: true,
      data: {
        specification: parsedSpec.data.validatedSpec,
        architecture: architecture.data,
        frontend: frontend.data,
        backend: backend.data,
        database: database.data,
        integration: integration.data || {},
        config: config.data,
        qa: qa.data || {},
        message: "Code generation complete",
      },
    };
  } catch (error) {
    console.error("❌ Orchestration failed:", error);

    // Mark all remaining agents as failed
    agents.forEach((agent) => {
      if (agent.status === "pending" || agent.status === "processing") {
        agent.status = "failed";
      }
    });

    onProgress({
      currentAgent: "Error",
      percentage: 0,
      message: `Orchestration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      agents: agents,
    });

    return {
      success: false,
      data: {},
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}


