import type { PendingVote } from "../models/jevent.js";
import type { PendingSummary } from "../services/fetch-pending-summary.js";
import {
  formatPendingItemLine,
  formatVoterMessageFooter,
} from "./format-voter-dm-messages.js";

const TELEGRAM_MESSAGE_LIMIT = 4096;

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

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

  const word =
    count === 1 ? "заявка" : count < 5 ? "заявки" : "заявок";

  return (
    `\n<b>Давно ждут вашего голоса</b> (${count} ${word} в «${status}»):\n`
  );
}

function formatRecentSectionIntro(count: number): string {
  if (count === 0) {
    return "";
  }

  const word =
    count === 1 ? "заявка" : count < 5 ? "заявки" : "заявок";

  return `\n<b>Недавно в ревью</b> (${count} ${word}):\n`;
}

export function buildMyApplicationsBody(
  summary: PendingSummary,
  stalled: PendingVote[],
  recent: PendingVote[],
  options: FormatMyApplicationsOptions,
): string {
  const { stallFilterActive } = options;
  let body =
    formatMainHeader(summary) +
    formatStalledSectionIntro(summary, stalled.length, stallFilterActive);

  for (const item of stalled) {
    body += `\n${formatPendingItemLine(item)}`;
  }

  body += formatRecentSectionIntro(recent.length);

  for (const item of recent) {
    body += `\n${formatPendingItemLine(item)}`;
  }

  return body;
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

  const messages: string[] = [];
  let current = intro;

  for (const block of itemBlocks) {
    if (current.length + block.length + footer.length > TELEGRAM_MESSAGE_LIMIT) {
      messages.push(current.trimEnd());
      current = block.trimStart();
      continue;
    }
    current += block;
  }

  if (current.trim()) {
    messages.push((current + footer).trimEnd());
  }

  return messages.length > 0 ? messages : [(intro + footer).trimEnd()];
}

export function formatNoPendingApplicationsMessage(summary: PendingSummary): string {
  const status = escapeHtml(summary.eligibleStatusName);
  return `✅ Нет непроголосованных заявок в статусе «${status}».`;
}
