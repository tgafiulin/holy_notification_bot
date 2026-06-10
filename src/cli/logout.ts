import "dotenv/config";

import { clearSession } from "../auth/session.js";

async function main(): Promise<void> {
  await clearSession();
  console.log("Session cleared (.data/session.json, .data/beta-token.json).");
}

main().catch((error: unknown) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
