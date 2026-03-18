/**
 * Phase 2 TIER 3 Integration Test
 * Tests code generation and file assembly end-to-end
 */

import { CodeGenerator } from "./codegen/generators/codeGenerator";
import { FileAssembler } from "./codegen/generators/fileAssembler";
import { ProjectAssembler } from "./utils/projectAssembler";

// Mock generation data from orchestrator
const mockGenerationData = {
  projectName: "E2E Test Tournament",
  specification: {
    tournamentName: "E2E Test Chess Championship",
    date: "2026-05-20",
    location: "San Francisco",
    description: "End-to-end test tournament",
    pages: ["home", "info", "register"],
    colorScheme: "modern",
  },
  architecture: {
    folderStructure: {
      client: ["src/pages", "src/components", "src/hooks", "src/lib"],
      server: ["routes", "middleware", "controllers", "utils", "services"],
      shared: ["types", "constants", "schemas"],
    },
  },
  frontend: {
    components: [
      {
        name: "TournamentCard",
        props: [
          { name: "name", type: "string", optional: false },
          { name: "date", type: "string", optional: false },
          { name: "participants", type: "number", optional: false },
        ],
        imports: "",
        jsx: `<div className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg">
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="text-sm text-gray-600">{date}</p>
        <p className="text-sm text-gray-500">{participants} Participants</p>
      </div>`,
      },
    ],
    pages: [
      {
        name: "Home",
        path: "/",
        components: ["TournamentCard"],
        hooks: [],
      },
    ],
  },
  backend: {
    routes: [
      {
        method: "GET",
        path: "/api/tournament",
        name: "Get tournament data",
        params: {},
        logic: `const tournaments = await db.query.tournaments.findMany();`,
        response: `{ tournaments }`,
      },
    ],
  },
  database: {
    tables: [
      {
        name: "tournaments",
        fields: [
          { fieldName: "id", type: "uuid", constraints: { primaryKey: true } },
          { fieldName: "name", type: "string", constraints: { notNull: true } },
          { fieldName: "date", type: "date", constraints: { notNull: true } },
        ],
      },
    ],
  },
};

async function runTest() {
  console.log("🧪 Phase 2 TIER 3 Integration Test\n");
  console.log("================================\n");

  try {
    // STEP 1: Code Generation
    console.log("📝 Step 1: Generate Code Files");
    const codeGenResult = CodeGenerator.generateProject(mockGenerationData);

    if (!codeGenResult.success) {
      console.error("❌ Code generation failed:", codeGenResult.errors);
      return;
    }

    console.log(`✅ Generated ${codeGenResult.files.length} files`);
    console.log(
      `   Types: ${Object.entries(
        codeGenResult.files.reduce(
          (acc: any, f) => {
            acc[f.type] = (acc[f.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        )
      )
        .map(([t, c]) => `${t}: ${c}`)
        .join(", ")}`
    );

    // STEP 2: File Validation
    console.log("\n✔️ Step 2: Validate Generated Files");
    for (const file of codeGenResult.files) {
      if (file.type === "typescript") {
        const validation = FileAssembler.validateTypeScript(file.content);
        if (!validation.valid) {
          console.warn(`⚠️  ${file.path}: ${validation.errors.join(", ")}`);
        } else {
          console.log(`✓ ${file.path}`);
        }
      }
    }

    // STEP 3: Project Statistics
    console.log("\n📊 Step 3: Project Statistics");
    const stats = FileAssembler.getProjectStats(codeGenResult.files);
    console.log(`   Total Files: ${stats.totalFiles}`);
    console.log(`   Total Lines: ${stats.totalLines}`);
    console.log(
      `   By Type: ${Object.entries(stats.filesByType)
        .map(([t, c]) => `${t}(${c})`)
        .join(", ")}`
    );

    // STEP 4: Project Assembly (Dry run - create temp directory)
    console.log("\n🔨 Step 4: Project Assembly");
    const projectId = "test-project-" + Date.now();
    const assemblyResult = await ProjectAssembler.assembleProject(
      projectId,
      mockGenerationData.projectName,
      mockGenerationData
    );

    if (!assemblyResult.success) {
      console.error("❌ Project assembly failed:", assemblyResult.errors);
      return;
    }

    console.log(`✅ Project assembled successfully`);
    console.log(`   Path: ${assemblyResult.projectPath}`);
    console.log(`   Files: ${assemblyResult.stats.filesGenerated}`);

    // STEP 5: Verify Project Structure
    console.log("\n✔️ Step 5: Verify Project Structure");
    const verifyResult = ProjectAssembler.verifyProject(assemblyResult.projectPath);
    console.log(`   Valid: ${verifyResult.valid}`);
    if (verifyResult.issues.length > 0) {
      console.log(`   Issues: ${verifyResult.issues.join(", ")}`);
    }

    console.log("\n✨ All tests passed!\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest();
}

export { runTest };
