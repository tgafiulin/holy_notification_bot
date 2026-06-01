export type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

function parsePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const value = parts.find((part) => part.type === type)?.value;
  if (value == null) {
    throw new Error(`Missing ${type} in zoned date parts`);
  }
  return Number(value);
}

export function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekdayToken = parts.find((part) => part.type === "weekday")?.value ?? "";

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const weekday = weekdayMap[weekdayToken];
  if (weekday == null) {
    throw new Error(`Unknown weekday token: ${weekdayToken}`);
  }

  return {
    year: parsePart(parts, "year"),
    month: parsePart(parts, "month"),
    day: parsePart(parts, "day"),
    hour: parsePart(parts, "hour"),
    minute: parsePart(parts, "minute"),
    second: parsePart(parts, "second"),
    weekday,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const zonedDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return zonedDate.getTime() - utcDate.getTime();
}

/** Local calendar date/time in `timeZone` → UTC Date. */
export function zonedLocalToUtc(
  local: Pick<ZonedDateParts, "year" | "month" | "day" | "hour" | "minute">,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, 0);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

export function addDaysToLocalDate(
  local: Pick<ZonedDateParts, "year" | "month" | "day">,
  days: number,
): Pick<ZonedDateParts, "year" | "month" | "day"> {
  const date = new Date(Date.UTC(local.year, local.month - 1, local.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}
