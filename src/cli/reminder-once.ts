import "dotenv/config";

import { Bot } from "grammy";

import { loadBotConfig } from "../bot/config.js";
import { loadReminderConfig } from "../reminder/reminder-config.js";
import { runScheduledReminders } from "../reminder/run-scheduled-reminders.js";

async function main(): Promise<void> {
  const botConfig = loadBotConfig();
  const reminderConfig = loadReminderConfig();
  const bot = new Bot(botConfig.token);

  console.log(
    `Reminder run (event ${reminderConfig.eventId}, tz ${reminderConfig.timezone})`,
  );

  await runScheduledReminders({
    api: bot.api,
    adminUserId: botConfig.adminUserId,
    config: reminderConfig,
  });
}

main().catch((error: unknown) => {
  console.error("Reminder error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
