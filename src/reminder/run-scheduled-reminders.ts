import type { Api } from "grammy";

import { PENDING_MESSAGE_PARSE_MODE } from "../bot/format-pending-messages.js";
import { loadVotersRegistry } from "../voters/load-voters.js";
import { loadStallConfig } from "../config/stall-config.js";
import { fetchPendingWithSession } from "../services/fetch-pending-with-session.js";
import { sendPollReports } from "../services/send-poll-reports.js";
import { sendVoterNotifications } from "../services/send-voter-notifications.js";
import { checkAndNotifyMissedSlots } from "./check-missed-slots.js";
import {
  formatAllVotedAdminMessage,
  formatScheduledNotifyReport,
  formatScheduledSessionError,
  HTML_PARSE_MODE,
} from "./format-reminder-messages.js";
import { findActiveSlot } from "./reminder-slots.js";
import { loadReminderState, saveReminderState } from "./reminder-state-io.js";
import type { ReminderConfig } from "./types.js";

export type ScheduledReminderDeps = {
  api: Api;
  adminUserId: number;
  config: ReminderConfig;
};

function markSlotProcessed(state: Awaited<ReturnType<typeof loadReminderState>>, slotId: string): void {
  if (!state.processedSlots.includes(slotId)) {
    state.processedSlots.push(slotId);
  }
}

/** Notify admin and poll viewers about past slots that were never completed (no voter DMs). */
export async function runMissedSlotsCheck(deps: ScheduledReminderDeps): Promise<void> {
  const registry = await loadVotersRegistry();

  await checkAndNotifyMissedSlots(deps.config, {
    sendAdminMessage: (text) =>
      sendPollReports(deps.api, deps.adminUserId, registry, text, HTML_PARSE_MODE),
  });
}

/**
 * Hourly cron entry: missed slots + active slot run (poll + optional DMs).
 */
export async function runScheduledReminders(deps: ScheduledReminderDeps): Promise<void> {
  await runMissedSlotsCheck(deps);

  const now = new Date();
  const state = await loadReminderState(deps.config.eventId);
  const processed = new Set(state.processedSlots);

  const activeSlot = findActiveSlot(deps.config, now, processed);
  if (activeSlot == null) {
    return;
  }

  const registry = await loadVotersRegistry();
  const fetchResult = await fetchPendingWithSession(deps.config.eventId);

  if (!fetchResult.ok) {
    const message =
      fetchResult.kind === "needs_credentials"
        ? fetchResult.message
        : fetchResult.kind === "session_failed"
          ? `Сессия ЛКО: ${fetchResult.message}`
          : fetchResult.message;

    await sendPollReports(
      deps.api,
      deps.adminUserId,
      registry,
      formatScheduledSessionError(activeSlot, deps.config.timezone, message),
      HTML_PARSE_MODE,
    );
    return;
  }

  const { summary } = fetchResult;

  if (summary.pendingCount === 0) {
    await sendPollReports(
      deps.api,
      deps.adminUserId,
      registry,
      formatAllVotedAdminMessage(activeSlot, deps.config.timezone, summary.eventId),
      HTML_PARSE_MODE,
    );
    markSlotProcessed(state, activeSlot.id);
    await saveReminderState(state);
    return;
  }
  const notifyResult = await sendVoterNotifications(deps.api, summary, registry, {
    stallConfig: loadStallConfig(),
    speechFirstSeen: state.speechFirstSeen ?? {},
  });

  state.speechFirstSeen = notifyResult.speechFirstSeen;

  const remindedAt = new Date().toISOString();

  for (const sent of notifyResult.sent) {
    state.voters[sent.voterName] = { lastRemindedAt: remindedAt };
  }

  await saveReminderState(state);

  await sendPollReports(
    deps.api,
    deps.adminUserId,
    registry,
    formatScheduledNotifyReport(notifyResult, activeSlot, deps.config.timezone),
    PENDING_MESSAGE_PARSE_MODE,
  );

  markSlotProcessed(state, activeSlot.id);
  await saveReminderState(state);
}
