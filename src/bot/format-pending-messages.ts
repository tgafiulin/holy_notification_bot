import type { PendingSummary } from "../services/fetch-pending-summary.js";
import { formatVoterLabelHtml } from "../voters/format-voter-label.js";
import type { VotersMap } from "../voters/types.js";

const TELEGRAM_MESSAGE_LIMIT = 4096;

export const PENDING_MESSAGE_PARSE_MODE = "HTML" as const;

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatSummaryHeader(summary: PendingSummary): string {
  return (
    `📊 Непроголосованные (event ${summary.eventId})\n\n` +
    `Статус «${summary.eligibleStatusName}» (id=${summary.eligibleStatusId}): ` +
    `${summary.eligibleSpeechCount} заявок\n` +
    `Pending: ${summary.pendingCount}`
  );
}

function formatVoterBlock(
  voterName: string,
  pendingCount: number,
  items: { authorNames: string; speechTitle: string }[],
  votersMap: VotersMap,
): string {
  const lines = items.map(
    (item) =>
      `  • ${escapeHtml(item.authorNames)} — ${escapeHtml(item.speechTitle)}`,
  );
  const label = formatVoterLabelHtml(voterName, votersMap, escapeHtml);
  return `${label} (${pendingCount}):\n${lines.join("\n")}`;
}

export function formatPendingMessages(
  summary: PendingSummary,
  votersMap: VotersMap = new Map(),
): string[] {
  if (summary.byVoter.length === 0) {
    return [
      `${formatSummaryHeader(summary)}\n\n` +
        `✅ Все проголосовали по заявкам в статусе «${summary.eligibleStatusName}».`,
    ];
  }

  const voterBlocks = summary.byVoter.map((voter) =>
    formatVoterBlock(
      voter.voterName,
      voter.pending.length,
      voter.pending,
      votersMap,
    ),
  );

  const messages: string[] = [];
  let current = formatSummaryHeader(summary) + "\n";

  for (let i = 0; i < voterBlocks.length; i++) {
    const block = (i === 0 ? "\n" : "\n\n") + voterBlocks[i];

    if (current.length + block.length > TELEGRAM_MESSAGE_LIMIT) {
      messages.push(current.trimEnd());
      current = block.trimStart();
      continue;
    }

    current += block;
  }

  if (current.trim()) {
    messages.push(current.trimEnd());
  }

  return messages;
}
