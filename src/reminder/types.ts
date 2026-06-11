export type ReminderSlotDefinition = {
  /** 0 = Sunday … 6 = Saturday (same as Date.getDay()). */
  weekday: number;
  hour: number;
  minute: number;
};

export type ReminderConfig = {
  timezone: string;
  slots: ReminderSlotDefinition[];
  eventId: string;
  /** How long after slot start the run is still allowed (ms). */
  slotGraceMs: number;
};

export type ReminderSlot = {
  id: string;
  weekday: number;
  hour: number;
  minute: number;
  /** UTC instant of slot start. */
  startUtc: Date;
};

export type VoterReminderRecord = {
  lastRemindedAt: string;
};

export type SpeechFirstSeenRecord = {
  firstSeenAt: string;
};

export type ReminderState = {
  eventId: string;
  processedSlots: string[];
  missedNotifiedSlots: string[];
  voters: Record<string, VoterReminderRecord>;
  /** Fallback in-review date when assignment pendingSince is null. */
  speechFirstSeen?: Record<string, SpeechFirstSeenRecord>;
};
