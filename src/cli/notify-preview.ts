import "dotenv/config";

import { DEFAULT_EVENT_ID } from "../config/constants.js";
import { loadStallConfig } from "../config/stall-config.js";
import { loadReminderState } from "../reminder/reminder-state-io.js";
import { fetchPendingWithSession } from "../services/fetch-pending-with-session.js";
import { planVoterNotifications } from "../services/send-voter-notifications.js";
import { loadVotersRegistry } from "../voters/load-voters.js";

const SEPARATOR = "═".repeat(72);

function printSkipped(voterName: string, reason: string): void {
  console.log(`⏭ ${voterName} — ${reason}`);
}

async function main(): Promise<void> {
  console.log("Загружаю данные (как «Разослать напоминания»)…\n");

  const fetchResult = await fetchPendingWithSession();

  if (!fetchResult.ok) {
    const message =
      fetchResult.kind === "needs_credentials"
        ? fetchResult.message
        : fetchResult.kind === "session_failed"
          ? `Сессия ЛКО: ${fetchResult.message}`
          : fetchResult.message;
    console.error(`❌ ${message}`);
    process.exitCode = 1;
    return;
  }

  const { summary } = fetchResult;
  const registry = await loadVotersRegistry();
  const reminderState = await loadReminderState(DEFAULT_EVENT_ID);
  const stallConfig = loadStallConfig();

  const { planned, skipped } = planVoterNotifications(summary, registry, {
    stallConfig,
    speechFirstSeen: reminderState.speechFirstSeen ?? {},
  });

  console.log(
    `Event ${summary.eventId}, pending: ${summary.pendingCount}, ` +
      `порог застоя: ${stallConfig.thresholdDays === 0 ? "выкл." : `${stallConfig.thresholdDays} дн.`}`,
  );
  console.log(`К отправке: ${planned.length}, пропуск: ${skipped.length}\n`);

  if (planned.length === 0 && skipped.length === 0) {
    console.log("✅ Нет pending-заявок — рассылать нечего.");
    return;
  }

  for (const item of planned) {
    console.log(SEPARATOR);
    console.log(
      `📤 ${item.voterName} → telegramUserId ${item.telegramUserId} (${item.pendingCount} заявок)`,
    );
    console.log(SEPARATOR);

    for (let i = 0; i < item.messages.length; i++) {
      if (item.messages.length > 1) {
        console.log(`\n--- сообщение ${i + 1}/${item.messages.length} ---\n`);
      }
      console.log(item.messages[i]);
      console.log();
    }
  }

  if (skipped.length > 0) {
    console.log(SEPARATOR);
    console.log("Пропущены:");
    console.log(SEPARATOR);
    for (const item of skipped) {
      printSkipped(item.voterName, item.reason);
    }
    console.log();
  }
}

main().catch((error: unknown) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
