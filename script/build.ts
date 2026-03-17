/**
 * Build script for TypeScript compilation and bundling
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

console.log("🔨 Building Agentic Platform...\n");

try {
  // 1. Type check
  console.log("📝 Type checking...");
  execSync("tsc --noEmit", { cwd: projectRoot, stdio: "inherit" });

  // 2. Build frontend
  console.log("\n🎨 Building frontend...");
  execSync("vite build", { cwd: projectRoot, stdio: "inherit" });

  // 3. Build backend
  console.log("\n⚙️  Building backend...");
  execSync("npm run build:server", { cwd: projectRoot, stdio: "inherit" });

  console.log("\n✅ Build successful!\n");
  console.log("📦 Output:");
  console.log("   - Frontend: dist/public/");
  console.log("   - Backend:  dist/index.cjs");

  process.exit(0);
} catch (error) {
  console.error("\n❌ Build failed!", error);
  process.exit(1);
}
