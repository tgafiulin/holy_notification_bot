import { DEFAULT_TIMEZONE } from "./constants.js";

export const DEFAULT_STALL_THRESHOLD_DAYS = 14;

export type StallConfig = {
  /** 0 = no stall filter (v1 behaviour). */
  thresholdDays: number;
  timeZone: string;
};

function parseThresholdDays(raw: string | undefined): number {
  const value = raw?.trim();
  if (value == null || value === "") {
    return DEFAULT_STALL_THRESHOLD_DAYS;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error(
      `Invalid STALL_THRESHOLD_DAYS "${raw}". Expected a non-negative integer.`,
    );
  }

  return parsed;
}

export function loadStallConfig(): StallConfig {
  const timeZone = DEFAULT_TIMEZONE;

  let thresholdDays: number;
  try {
    thresholdDays = parseThresholdDays(process.env.STALL_THRESHOLD_DAYS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Stall config: ${message}`);
  }

  return { thresholdDays, timeZone };
}
