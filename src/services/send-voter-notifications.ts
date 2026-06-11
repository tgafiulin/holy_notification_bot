import type { Api } from "grammy";

import type { StallConfig } from "../config/stall-config.js";
import {
  formatVoterDmMessages,
  VOTER_DM_PARSE_MODE,
} from "../bot/format-voter-dm-messages.js";
import type { PendingSummary } from "./fetch-pending-summary.js";
import { findVoterRecordByMemberId } from "../scraper/committee-members.js";
import type { VotersRegistry } from "../voters/types.js";
import type { SpeechFirstSeenMap } from "../stall/speech-first-seen.js";
import {
  filterStalledPending,
  isStallThresholdDisabled,
  STALL_SKIP_REASON,
} from "../stall/stall-filter.js";

export type NotifySent = {
  voterName: string;
  telegramUserId: number;
  pendingCount: number;
};

export type NotifySkipped = {
  voterName: string;
  reason: string;
};

export type NotifyFailed = {
  voterName: string;
  telegramUserId: number;
  error: string;
};

export type NotifyVotersResult = {
  sent: NotifySent[];
  skipped: NotifySkipped[];
  failed: NotifyFailed[];
};

export type SendVoterNotificationsOptions = {
  stallConfig: StallConfig;
  speechFirstSeen: SpeechFirstSeenMap;
};

export type SendVoterNotificationsResult = NotifyVotersResult & {
  speechFirstSeen: SpeechFirstSeenMap;
};

export type VoterNotificationPlan = {
  voterName: string;
  telegramUserId: number;
  pendingCount: number;
  messages: string[];
};

export type PlanVoterNotificationsResult = {
  planned: VoterNotificationPlan[];
  skipped: NotifySkipped[];
  speechFirstSeen: SpeechFirstSeenMap;
};

export function planVoterNotifications(
  summary: PendingSummary,
  registry: VotersRegistry,
  options: SendVoterNotificationsOptions,
): PlanVoterNotificationsResult {
  const planned: VoterNotificationPlan[] = [];
  const skipped: NotifySkipped[] = [];

  let speechFirstSeen = options.speechFirstSeen;
  const now = new Date();
  const stallFilterActive = !isStallThresholdDisabled(options.stallConfig);

  if (summary.byVoter.length === 0) {
    return { planned, skipped, speechFirstSeen };
  }

  for (const voter of summary.byVoter) {
    const byMemberId = findVoterRecordByMemberId(registry, voter.voterId);
    const voterName = byMemberId?.jeventName ?? voter.voterName;
    const record = byMemberId?.record ?? registry.get(voter.voterName);

    if (!record?.telegramUserId) {
      skipped.push({
        voterName,
        reason: "нет telegramUserId в voters.json",
      });
      continue;
    }

    const { stalled, firstSeenMap } = filterStalledPending(
      voter.pending,
      options.stallConfig,
      speechFirstSeen,
      now,
    );
    speechFirstSeen = firstSeenMap;

    if (stalled.length === 0) {
      skipped.push({
        voterName,
        reason: stallFilterActive
          ? STALL_SKIP_REASON
          : "нет заявок для напоминания",
      });
      continue;
    }

    planned.push({
      voterName,
      telegramUserId: record.telegramUserId,
      pendingCount: stalled.length,
      messages: formatVoterDmMessages(summary, stalled, { stallFilterActive }),
    });
  }

  return { planned, skipped, speechFirstSeen };
}

function describeTelegramSendError(error: unknown): string {
  if (error && typeof error === "object" && "description" in error) {
    const description = String((error as { description: unknown }).description);

    if (description.includes("bot was blocked")) {
      return "пользователь заблокировал бота";
    }

    if (description.includes("chat not found") || description.includes("user is deactivated")) {
      return "чат недоступен — попросите написать боту /start";
    }

    return description;
  }

  return error instanceof Error ? error.message : "неизвестная ошибка";
}

export async function sendVoterNotifications(
  api: Api,
  summary: PendingSummary,
  registry: VotersRegistry,
  options: SendVoterNotificationsOptions,
): Promise<SendVoterNotificationsResult> {
  const result: NotifyVotersResult = {
    sent: [],
    skipped: [],
    failed: [],
  };

  const { planned, skipped, speechFirstSeen } = planVoterNotifications(
    summary,
    registry,
    options,
  );
  result.skipped = skipped;

  for (const item of planned) {
    try {
      for (const text of item.messages) {
        await api.sendMessage(item.telegramUserId, text, {
          parse_mode: VOTER_DM_PARSE_MODE,
        });
      }

      result.sent.push({
        voterName: item.voterName,
        telegramUserId: item.telegramUserId,
        pendingCount: item.pendingCount,
      });
    } catch (error) {
      result.failed.push({
        voterName: item.voterName,
        telegramUserId: item.telegramUserId,
        error: describeTelegramSendError(error),
      });
    }
  }

  return { ...result, speechFirstSeen };
}
