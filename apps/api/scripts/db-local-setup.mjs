import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

function sh(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

// Create a local D1 database if it doesn't exist and apply migrations.
if (!existsSync("./.wrangler/state/v3/d1")) {
  console.log("No local D1 state found yet. Wrangler will create it on first run.");
}

sh("wrangler d1 migrations apply creamininja-db --local");
console.log("\nLocal D1 ready.");
