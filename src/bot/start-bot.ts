import type { Bot } from "grammy";

import { loadReminderConfig } from "../reminder/reminder-config.js";
import { runMissedSlotsCheck } from "../reminder/run-scheduled-reminders.js";
import type { BotConfig } from "./config.js";

export async function startBotWithReminders(bot: Bot, config: BotConfig): Promise<void> {
  let reminderConfig;

  try {
    reminderConfig = loadReminderConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Reminder config error: ${message}`);
    console.log(`Bot started (admin user id: ${config.adminUserId})`);
    await bot.start();
    return;
  }

  void runMissedSlotsCheck({
    api: bot.api,
    adminUserId: config.adminUserId,
    config: reminderConfig,
  }).catch((error: unknown) => {
    console.error(
      "Missed slots check failed:",
      error instanceof Error ? error.message : error,
    );
  });

  console.log(
    `Bot started (admin user id: ${config.adminUserId}, reminders: ${reminderConfig.timezone})`,
  );
  await bot.start();
}
