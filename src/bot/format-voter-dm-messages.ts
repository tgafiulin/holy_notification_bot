import type { PendingVote } from "../models/jevent.js";
import type { PendingSummary } from "../services/fetch-pending-summary.js";

const TELEGRAM_MESSAGE_LIMIT = 4096;

export const VOTER_DM_PARSE_MODE = "HTML" as const;

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatDmHeader(summary: PendingSummary, pendingCount: number): string {
  return (
    `📋 <b>Напоминание о голосовании</b> (event ${summary.eventId})\n\n` +
    `У вас ${pendingCount} непроголосованных заявок в статусе «${escapeHtml(summary.eligibleStatusName)}»:\n`
  );
}

function formatPendingItem(item: Pick<PendingVote, "authorNames" | "speechTitle">): string {
  return `• ${escapeHtml(item.authorNames)} — ${escapeHtml(item.speechTitle)}`;
}

export function formatVoterDmMessages(
  summary: PendingSummary,
  pending: PendingVote[],
): string[] {
  const itemLines = pending.map(formatPendingItem);
  const pollingUrl = `https://jevent.jugru.org/polling/${summary.eventId}`;
  const footer = `\n\nПожалуйста, проголосуйте в jEvent.\n${pollingUrl}`;

  const messages: string[] = [];
  let current = formatDmHeader(summary, pending.length);

  for (const line of itemLines) {
    const block = `\n${line}`;

    if (current.length + block.length + footer.length > TELEGRAM_MESSAGE_LIMIT) {
      messages.push(current.trimEnd());
      current = line;
      continue;
    }

    current += block;
  }

  if (current.trim()) {
    messages.push((current + footer).trimEnd());
  }

  return messages;
}
