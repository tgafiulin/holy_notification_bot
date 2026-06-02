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

function formatDmHeader(
  summary: PendingSummary,
  pendingCount: number,
  stallFilterActive: boolean,
): string {
  const status = escapeHtml(summary.eligibleStatusName);

  if (stallFilterActive) {
    return (
      `📋 <b>Напоминание о голосовании</b> (event ${summary.eventId})\n\n` +
      `У вас ${pendingCount} ${pendingCount === 1 ? "заявка" : pendingCount < 5 ? "заявки" : "заявок"}, ` +
      `которые давно ждут вашего голоса в статусе «${status}»:\n`
    );
  }

  return (
    `📋 <b>Напоминание о голосовании</b> (event ${summary.eventId})\n\n` +
    `У вас ${pendingCount} непроголосованных заявок в статусе «${status}»:\n`
  );
}

function formatPendingItem(item: Pick<PendingVote, "authorNames" | "speechTitle">): string {
  return `• ${escapeHtml(item.authorNames)} — ${escapeHtml(item.speechTitle)}`;
}

export type FormatVoterDmOptions = {
  stallFilterActive?: boolean;
};

export function formatVoterDmMessages(
  summary: PendingSummary,
  pending: PendingVote[],
  options: FormatVoterDmOptions = {},
): string[] {
  const stallFilterActive = options.stallFilterActive ?? false;
  const itemLines = pending.map(formatPendingItem);
  const pollingUrl = `https://jevent.jugru.org/polling/${summary.eventId}`;
  const footer = `\n\nПожалуйста, проголосуйте в jEvent.\n${pollingUrl}`;

  const messages: string[] = [];
  let current = formatDmHeader(summary, pending.length, stallFilterActive);

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
