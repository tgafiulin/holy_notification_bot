import type { PendingVote } from "../models/jevent.js";
import type { PendingSummary } from "../services/fetch-pending-summary.js";
import { escapeHtml } from "../telegram/html.js";
import { formatPendingItemLine } from "../telegram/pending-line.js";
import { pluralizeApplications } from "../telegram/pluralize.js";
import { splitTelegramMessages } from "../telegram/split-messages.js";
import { formatVoterMessageFooter } from "./format-voter-dm-messages.js";

export type FormatMyApplicationsOptions = {
  stallFilterActive: boolean;
};

function formatMainHeader(summary: PendingSummary): string {
  const status = escapeHtml(summary.eligibleStatusName);
  return (
    `📋 <b>Ваши заявки</b> (event ${summary.eventId})\n` +
    `Статус «${status}»:\n`
  );
}

function formatStalledSectionIntro(
  summary: PendingSummary,
  count: number,
  stallFilterActive: boolean,
): string {
  const status = escapeHtml(summary.eligibleStatusName);

  if (!stallFilterActive) {
    return `\n<b>Непроголосованные</b> (${count}):\n`;
  }

  if (count === 0) {
    return "\nНет заявок, которые давно ждут вашего голоса.\n";
  }

  return (
    `\n<b>Давно ждут вашего голоса</b> (${count} ${pluralizeApplications(count)} в «${status}»):\n`
  );
}

function formatRecentSectionIntro(count: number): string {
  if (count === 0) {
    return "";
  }

  return `\n<b>Недавно в ревью</b> (${count} ${pluralizeApplications(count)}):\n`;
}

export function formatMyApplicationsMessages(
  summary: PendingSummary,
  stalled: PendingVote[],
  recent: PendingVote[],
  options: FormatMyApplicationsOptions,
): string[] {
  const footer = formatVoterMessageFooter(summary);
  const intro =
    formatMainHeader(summary) +
    formatStalledSectionIntro(summary, stalled.length, options.stallFilterActive) +
    formatRecentSectionIntro(recent.length);

  const itemBlocks: string[] = [];
  for (const item of stalled) {
    itemBlocks.push(`\n${formatPendingItemLine(item)}`);
  }
  for (const item of recent) {
    itemBlocks.push(`\n${formatPendingItemLine(item)}`);
  }

  const messages = splitTelegramMessages({
    prefix: intro,
    parts: itemBlocks,
    suffix: footer,
  });

  return messages.length > 0 ? messages : [(intro + footer).trimEnd()];
}

export function formatNoPendingApplicationsMessage(summary: PendingSummary): string {
  const status = escapeHtml(summary.eligibleStatusName);
  return `✅ Нет непроголосованных заявок в статусе «${status}».`;
}
