import { JEVENT_URLS } from "../config/urls.js";
import type { PendingVote } from "../models/jevent.js";
import type { PendingSummary } from "../services/fetch-pending-summary.js";
import { escapeHtml } from "../telegram/html.js";
import { formatPendingItemLine } from "../telegram/pending-line.js";
import { pluralizeApplications } from "../telegram/pluralize.js";
import { splitTelegramMessages } from "../telegram/split-messages.js";

export { formatPendingItemLine } from "../telegram/pending-line.js";

export const VOTER_DM_PARSE_MODE = "HTML" as const;

function formatDmHeader(
  summary: PendingSummary,
  pendingCount: number,
  stallFilterActive: boolean,
): string {
  const status = escapeHtml(summary.eligibleStatusName);

  if (stallFilterActive) {
    return (
      `📋 <b>Напоминание о голосовании</b> (event ${summary.eventId})\n\n` +
      `У вас ${pendingCount} ${pluralizeApplications(pendingCount)}, ` +
      `которые давно ждут вашего голоса в статусе «${status}»:\n`
    );
  }

  return (
    `📋 <b>Напоминание о голосовании</b> (event ${summary.eventId})\n\n` +
    `У вас ${pendingCount} непроголосованных заявок в статусе «${status}»:\n`
  );
}

export type FormatVoterDmOptions = {
  stallFilterActive?: boolean;
};

export function formatVoterMessageFooter(
  summary: Pick<PendingSummary, "eventId">,
): string {
  const pollingUrl = JEVENT_URLS.polling(summary.eventId);
  return `\n\nПожалуйста, проголосуйте в ЛКО.\n${pollingUrl}`;
}

export function formatVoterDmMessages(
  summary: PendingSummary,
  pending: PendingVote[],
  options: FormatVoterDmOptions = {},
): string[] {
  const stallFilterActive = options.stallFilterActive ?? false;
  const footer = formatVoterMessageFooter(summary);

  return splitTelegramMessages({
    prefix: formatDmHeader(summary, pending.length, stallFilterActive),
    parts: pending.map(formatPendingItemLine),
    suffix: footer,
  });
}
