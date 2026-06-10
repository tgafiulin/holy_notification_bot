import type { PendingSummary } from "../services/fetch-pending-summary.js";
import { escapeHtml } from "../telegram/html.js";
import { splitTelegramMessages } from "../telegram/split-messages.js";
import { formatVoterLabelHtml } from "../voters/format-voter-label.js";
import type { VotersMap } from "../voters/types.js";

export const PENDING_MESSAGE_PARSE_MODE = "HTML" as const;

function formatSummaryHeader(summary: PendingSummary): string {
  return (
    `📊 Непроголосованные (event ${summary.eventId})\n\n` +
    `Статус «${summary.eligibleStatusName}»: ` +
    `${summary.eligibleProposalCount} заявок\n` +
    `Pending: ${summary.pendingCount}`
  );
}

function formatVoterBlock(
  voterName: string,
  pendingCount: number,
  items: { authorNames: string; proposalTitle: string }[],
  votersMap: VotersMap,
): string {
  const lines = items.map(
    (item) =>
      `  • ${escapeHtml(item.authorNames)} — ${escapeHtml(item.proposalTitle)}`,
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

  const parts = voterBlocks.map((block, i) => (i === 0 ? "\n" : "\n\n") + block);

  return splitTelegramMessages({
    prefix: `${formatSummaryHeader(summary)}\n`,
    parts,
  });
}
