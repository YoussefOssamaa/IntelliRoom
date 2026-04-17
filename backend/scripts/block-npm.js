// scripts/block-npm.js
const execPath = process.env.npm_execpath || "";
if (execPath.includes("npm") && !execPath.includes("pnpm")) {
  console.error("\n❌ ERROR: npm is disabled for this project. Use pnpm instead.\n");
  process.exit(1);
}
