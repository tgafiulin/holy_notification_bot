import "dotenv/config";

import { createBot } from "../bot/bot.js";
import { loadBotConfig } from "../bot/config.js";
import { startBotWithReminders } from "../bot/start-bot.js";

async function main(): Promise<void> {
  const config = loadBotConfig();
  const bot = createBot(config);
  await startBotWithReminders(bot, config);
}

main().catch((error: unknown) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
