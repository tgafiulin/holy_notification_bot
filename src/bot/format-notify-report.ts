import type { NotifyVotersResult } from "../services/send-voter-notifications.js";

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function formatNotifyReport(result: NotifyVotersResult): string {
  const lines: string[] = ["📤 <b>Результаты рассылки</b>", ""];

  if (result.sent.length === 0 && result.skipped.length === 0 && result.failed.length === 0) {
    lines.push("✅ Нет pending-заявок — рассылать нечего.");
    return lines.join("\n");
  }

  for (const item of result.sent) {
    lines.push(
      `✅ ${escapeHtml(item.voterName)} — ${item.pendingCount} заявок (id ${item.telegramUserId})`,
    );
  }

  for (const item of result.skipped) {
    lines.push(`⏭ ${escapeHtml(item.voterName)} — ${escapeHtml(item.reason)}`);
  }

  for (const item of result.failed) {
    lines.push(
      `❌ ${escapeHtml(item.voterName)} (id ${item.telegramUserId}) — ${escapeHtml(item.error)}`,
    );
  }

  return lines.join("\n");
}
