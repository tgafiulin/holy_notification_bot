import type { NotifyVotersResult } from "../services/send-voter-notifications.js";
import { formatNotifyReport } from "../bot/format-notify-report.js";
import type { ReminderSlot } from "./types.js";
import { formatSlotLabel } from "./reminder-slots.js";

const HTML_PARSE_MODE = "HTML" as const;

export { HTML_PARSE_MODE };

export function formatMissedSlotAdminMessage(
  slot: ReminderSlot,
  timeZone: string,
): string {
  const label = formatSlotLabel(slot, timeZone);
  return (
    "⚠️ <b>Пропущена автоматическая рассылка</b>\n\n" +
    `Слот: ${label}\n\n` +
    "Рассылка голосующим не выполнялась (бот был недоступен или не успел в окно слота). " +
    "Напоминания ПК — в следующий запланированный слот."
  );
}

export function formatAllVotedAdminMessage(
  slot: ReminderSlot,
  timeZone: string,
  eventId: string,
): string {
  const label = formatSlotLabel(slot, timeZone);
  return (
    "🕐 <b>Автоматическая проверка</b>\n\n" +
    `Слот: ${label}\n` +
    `Event ${eventId}\n\n` +
    "✅ Нет непроголосованных заявок в статусе «Ревью ПК» — рассылать нечего."
  );
}

export function formatScheduledNotifyReport(
  result: NotifyVotersResult,
  slot: ReminderSlot,
  timeZone: string,
): string {
  const label = formatSlotLabel(slot, timeZone);
  return `🕐 <b>Автоматическая рассылка</b>\n\nСлот: ${label}\n\n${formatNotifyReport(result)}`;
}

export function formatScheduledSessionError(
  slot: ReminderSlot | null,
  timeZone: string,
  message: string,
): string {
  const slotLine =
    slot != null
      ? `Слот: ${formatSlotLabel(slot, timeZone)}\n\n`
      : "";

  return (
    "❌ <b>Автоматическая рассылка не выполнена</b>\n\n" +
    slotLine +
    `Причина: ${message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}`
  );
}
