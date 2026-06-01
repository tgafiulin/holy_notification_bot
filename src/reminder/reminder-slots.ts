import type { ReminderConfig, ReminderSlot } from "./types.js";
import {
  addDaysToLocalDate,
  getZonedDateParts,
  zonedLocalToUtc,
  type ZonedDateParts,
} from "./timezone.js";

const WEEKDAY_NAMES_RU = [
  "воскресенье",
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
] as const;

const MONTH_NAMES_RU = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

export function buildSlotId(
  local: Pick<ZonedDateParts, "year" | "month" | "day" | "hour" | "minute">,
): string {
  const month = String(local.month).padStart(2, "0");
  const day = String(local.day).padStart(2, "0");
  const hour = String(local.hour).padStart(2, "0");
  const minute = String(local.minute).padStart(2, "0");
  return `${local.year}-${month}-${day}T${hour}:${minute}`;
}

export function formatSlotLabel(slot: ReminderSlot, timeZone: string): string {
  const local = getZonedDateParts(slot.startUtc, timeZone);
  const weekday = WEEKDAY_NAMES_RU[local.weekday] ?? String(local.weekday);
  const month = MONTH_NAMES_RU[local.month - 1] ?? String(local.month);
  const hour = String(local.hour).padStart(2, "0");
  const minute = String(local.minute).padStart(2, "0");

  return `${weekday}, ${local.day} ${month}, ${hour}:${minute} (${timeZone})`;
}

function buildSlot(
  localDate: Pick<ZonedDateParts, "year" | "month" | "day">,
  definition: { weekday: number; hour: number; minute: number },
  timeZone: string,
): ReminderSlot {
  const startUtc = zonedLocalToUtc(
    {
      year: localDate.year,
      month: localDate.month,
      day: localDate.day,
      hour: definition.hour,
      minute: definition.minute,
    },
    timeZone,
  );

  const id = buildSlotId({
    year: localDate.year,
    month: localDate.month,
    day: localDate.day,
    hour: definition.hour,
    minute: definition.minute,
  });

  return {
    id,
    weekday: definition.weekday,
    hour: definition.hour,
    minute: definition.minute,
    startUtc,
  };
}

/** All configured slots in [now - lookbackDays, now + 1 day] (local calendar). */
export function enumerateSlotsInRange(
  config: ReminderConfig,
  now: Date,
  lookbackDays: number,
): ReminderSlot[] {
  const { timezone, slots: definitions } = config;
  const zonedNow = getZonedDateParts(now, timezone);
  const slots: ReminderSlot[] = [];
  const seen = new Set<string>();

  for (let dayOffset = -lookbackDays; dayOffset <= 1; dayOffset += 1) {
    const localDate =
      dayOffset === 0
        ? { year: zonedNow.year, month: zonedNow.month, day: zonedNow.day }
        : addDaysToLocalDate(zonedNow, dayOffset);

    const probe = zonedLocalToUtc(
      { ...localDate, hour: 12, minute: 0 },
      timezone,
    );
    const weekday = getZonedDateParts(probe, timezone).weekday;

    for (const definition of definitions) {
      if (definition.weekday !== weekday) {
        continue;
      }

      const slot = buildSlot(localDate, definition, timezone);
      if (seen.has(slot.id)) {
        continue;
      }

      seen.add(slot.id);
      slots.push(slot);
    }
  }

  slots.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
  return slots;
}

export function findActiveSlot(
  config: ReminderConfig,
  now: Date,
  processedSlotIds: ReadonlySet<string>,
): ReminderSlot | null {
  const slots = enumerateSlotsInRange(config, now, 2);

  for (const slot of slots) {
    if (processedSlotIds.has(slot.id)) {
      continue;
    }

    const slotEnd = slot.startUtc.getTime() + config.slotGraceMs;
    const nowMs = now.getTime();

    if (nowMs >= slot.startUtc.getTime() && nowMs < slotEnd) {
      return slot;
    }
  }

  return null;
}

export function findMissedSlots(
  config: ReminderConfig,
  now: Date,
  processedSlotIds: ReadonlySet<string>,
  missedNotifiedSlotIds: ReadonlySet<string>,
  lookbackDays: number = 14,
): ReminderSlot[] {
  const nowMs = now.getTime();
  const slots = enumerateSlotsInRange(config, now, lookbackDays);

  return slots.filter((slot) => {
    if (processedSlotIds.has(slot.id) || missedNotifiedSlotIds.has(slot.id)) {
      return false;
    }

    const slotEnd = slot.startUtc.getTime() + config.slotGraceMs;
    return nowMs >= slotEnd;
  });
}
