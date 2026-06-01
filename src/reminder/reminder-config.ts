import { DEFAULT_EVENT_ID } from "../config/constants.js";
import type { ReminderConfig, ReminderSlotDefinition } from "./types.js";

const DEFAULT_TIMEZONE = "Europe/Moscow";

const DEFAULT_SLOT_STRING = "Sun:16:00,Tue:13:00,Thu:16:00";

const WEEKDAY_ALIASES: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

/** One hour after slot start — window for cron / reminder-once. */
export const DEFAULT_SLOT_GRACE_MS = 60 * 60 * 1000;

function parseSlotToken(token: string): ReminderSlotDefinition {
  const match = /^([A-Za-z]+):(\d{1,2}):(\d{2})$/.exec(token.trim());
  if (!match) {
    throw new Error(
      `Invalid REMINDER_SLOTS entry "${token}". Expected format: Sun:16:00`,
    );
  }

  const weekday = WEEKDAY_ALIASES[match[1].toLowerCase()];
  if (weekday == null) {
    throw new Error(`Unknown weekday in REMINDER_SLOTS: ${match[1]}`);
  }

  const hour = Number(match[2]);
  const minute = Number(match[3]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid time in REMINDER_SLOTS entry: ${token}`);
  }

  return { weekday, hour, minute };
}

function parseReminderSlots(raw: string | undefined): ReminderSlotDefinition[] {
  const value = raw?.trim() || DEFAULT_SLOT_STRING;
  const slots = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseSlotToken);

  if (slots.length === 0) {
    throw new Error("REMINDER_SLOTS must contain at least one slot");
  }

  return slots;
}

export function loadReminderConfig(): ReminderConfig {
  const timezone = process.env.REMINDER_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
  const eventId = process.env.JEVENT_EVENT_ID?.trim() || DEFAULT_EVENT_ID;

  let slots: ReminderSlotDefinition[];
  try {
    slots = parseReminderSlots(process.env.REMINDER_SLOTS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Reminder config: ${message}`);
  }

  return {
    timezone,
    slots,
    eventId,
    slotGraceMs: DEFAULT_SLOT_GRACE_MS,
  };
}
