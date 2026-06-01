import type { ReminderConfig } from "./types.js";
import { formatMissedSlotAdminMessage } from "./format-reminder-messages.js";
import { findMissedSlots } from "./reminder-slots.js";
import { loadReminderState, saveReminderState } from "./reminder-state-io.js";

export type MissedSlotsNotifier = {
  sendAdminMessage: (text: string) => Promise<void>;
};

export async function checkAndNotifyMissedSlots(
  config: ReminderConfig,
  notifier: MissedSlotsNotifier,
): Promise<void> {
  const now = new Date();
  const state = await loadReminderState(config.eventId);
  const processed = new Set(state.processedSlots);
  const missedNotified = new Set(state.missedNotifiedSlots);

  const missed = findMissedSlots(config, now, processed, missedNotified);

  if (missed.length === 0) {
    return;
  }

  for (const slot of missed) {
    await notifier.sendAdminMessage(
      formatMissedSlotAdminMessage(slot, config.timezone),
    );
    state.missedNotifiedSlots.push(slot.id);
    await saveReminderState(state);
  }
}
