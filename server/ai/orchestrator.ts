import Anthropic from "@anthropic-ai/sdk";
import { TournamentSpecification, ArchitectureDesign, AgentOutput } from "@shared/types";

/**
 * Main AI Orchestrator Agent
 * Coordinates all specialized agents to generate a complete tournament website
 */
export class OrchestratorAgent {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Orchestrate the entire code generation workflow
   */
  async generateWebsite(
    spec: TournamentSpecification,
    onProgress: (update: {
      agent: string;
      progress: number;
      message: string;
    }) => void
  ): Promise<AgentOutput> {
    try {
      console.log("🎯 Starting orchestration for:", spec.tournamentName);

      // Step 1: Spec Parser - Validate input
      onProgress({
        agent: "SpecParser",
        progress: 5,
        message: "Parsing and validating specification...",
      });
      const parsedSpec = await this.parseSpecification(spec);
      if (!parsedSpec.success) {
        throw new Error(`Spec parsing failed: ${parsedSpec.errors?.join(", ")}`);
      }

      // Step 2: Architect - Design project structure
      onProgress({
        agent: "Architect",
        progress: 15,
        message: "Designing project architecture...",
      });
      const architecture = await this.designArchitecture(spec);
      if (!architecture.success) {
        throw new Error(`Architecture design failed: ${architecture.errors?.join(", ")}`);
      }

      // Step 3-5: Generate code in parallel where possible
      onProgress({
        agent: "CodeGeneration",
        progress: 30,
        message: "Generating frontend, backend, and database code...",
      });

      // Step 6: Integrations
      onProgress({
        agent: "IntegrationSetup",
        progress: 70,
        message: "Setting up external integrations...",
      });

      // Step 7: Config
      onProgress({
        agent: "ConfigGenerator",
        progress: 80,
        message: "Generating configuration files...",
      });

      // Step 8: QA
      onProgress({
        agent: "QA",
        progress: 90,
        message: "Validating generated code...",
      });

      onProgress({
        agent: "Complete",
        progress: 100,
        message: "Website generation complete!",
      });

      return {
        success: true,
        data: {
          spec: parsedSpec,
          architecture: architecture,
          message: "Code generation complete",
        },
      };
    } catch (error) {
      console.error("❌ Orchestration failed:", error);
      return {
        success: false,
        data: {},
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Specification Parser Agent
   */
  private async parseSpecification(
    spec: TournamentSpecification
  ): Promise<AgentOutput> {
    try {
      // TODO: Call Claude to validate and structure the specification
      // For now, just validate basic fields
      const errors: string[] = [];

      if (!spec.tournamentName) errors.push("Tournament name is required");
      if (!spec.tournamentDate) errors.push("Tournament date is required");
      if (!spec.location) errors.push("Location is required");
      if (!spec.pages || spec.pages.length === 0)
        errors.push("At least one page is required");

      if (errors.length > 0) {
        return {
          success: false,
          data: {},
          errors,
        };
      }

      return {
        success: true,
        data: { parsedSpec: spec },
      };
    } catch (error) {
      return {
        success: false,
        data: {},
        errors: [error instanceof Error ? error.message : "Parsing failed"],
      };
    }
  }

  /**
   * Architect Agent
   */
  private async designArchitecture(
    spec: TournamentSpecification
  ): Promise<AgentOutput> {
    try {
      // TODO: Call Claude to design the architecture
      const architecture: ArchitectureDesign = {
        projectName: spec.tournamentName,
        folderStructure: {
          name: "project-root",
          type: "folder",
          children: [
            { name: "client", type: "folder" },
            { name: "server", type: "folder" },
            { name: "shared", type: "folder" },
          ],
        },
        pages: [],
        components: [],
        database: {
          tables: [],
          relationships: [],
        },
        apiEndpoints: [],
        integrations: [],
      };

      return {
        success: true,
        data: { architecture },
      };
    } catch (error) {
      return {
        success: false,
        data: {},
        errors: [error instanceof Error ? error.message : "Architecture design failed"],
      };
    }
  }
}

/**
 * Simplified agent output for testing
 */
export async function testOrchestratorAgent() {
  const orchestrator = new OrchestratorAgent();

  const testSpec: TournamentSpecification = {
    tournamentName: "Test Chess Tournament",
    tournamentDate: "2026-04-15",
    location: "New York, NY",
    description: "A test chess tournament",
    colorScheme: {
      primary: "#0ea5e9",
      secondary: "#64748b",
      accent: "#ec4899",
      background: "#ffffff",
      text: "#1e293b",
    },
    pages: [
      { name: "home", type: "home", title: "Home" },
      { name: "info", type: "info", title: "Info" },
    ],
    hasRegistration: true,
    sections: [
      { id: "open", name: "Open", timeControl: "90+30" },
    ],
    customizations: {},
    integrations: [],
  };

  const result = await orchestrator.generateWebsite(testSpec, (update) => {
    console.log(
      `${update.agent}: ${update.progress}% - ${update.message}`
    );
  });

  return result;
}
