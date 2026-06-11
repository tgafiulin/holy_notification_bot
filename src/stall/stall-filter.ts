import type { StallConfig } from "../config/stall-config.js";
import type { PendingAssignment } from "../models/program.js";
import { calendarDaysBetweenInTimeZone } from "../reminder/timezone.js";
import {
  ensureSpeechFirstSeen,
  resolveInReviewSince,
  type SpeechFirstSeenMap,
} from "./speech-first-seen.js";

export function isStallThresholdDisabled(config: StallConfig): boolean {
  return config.thresholdDays === 0;
}

export function isStalledPending(
  item: PendingAssignment,
  config: StallConfig,
  firstSeenMap: SpeechFirstSeenMap,
  now: Date,
): boolean {
  if (isStallThresholdDisabled(config)) {
    return true;
  }

  const since = resolveInReviewSince(item, firstSeenMap, now);
  if (since == null) {
    return false;
  }

  const days = calendarDaysBetweenInTimeZone(since, now, config.timeZone);
  return days >= config.thresholdDays;
}

export function filterStalledPending(
  pending: PendingAssignment[],
  config: StallConfig,
  firstSeenMap: SpeechFirstSeenMap,
  now: Date,
): { stalled: PendingAssignment[]; firstSeenMap: SpeechFirstSeenMap } {
  if (isStallThresholdDisabled(config)) {
    return { stalled: pending, firstSeenMap };
  }

  let map = firstSeenMap;
  const stalled: PendingAssignment[] = [];

  for (const item of pending) {
    if (item.pendingSince == null) {
      map = ensureSpeechFirstSeen(map, item.proposalId, now);
    }

    if (isStalledPending(item, config, map, now)) {
      stalled.push(item);
    }
  }

  return { stalled, firstSeenMap: map };
}

export const STALL_SKIP_REASON = "ниже порога застоя";

export function splitPendingByStall(
  pending: PendingAssignment[],
  config: StallConfig,
  firstSeenMap: SpeechFirstSeenMap,
  now: Date,
): { stalled: PendingAssignment[]; recent: PendingAssignment[]; firstSeenMap: SpeechFirstSeenMap } {
  if (isStallThresholdDisabled(config)) {
    return { stalled: [...pending], recent: [], firstSeenMap };
  }

  const { stalled, firstSeenMap: map } = filterStalledPending(
    pending,
    config,
    firstSeenMap,
    now,
  );
  const stalledIds = new Set(stalled.map((item) => item.proposalId));
  const recent = pending.filter((item) => !stalledIds.has(item.proposalId));

  return { stalled, recent, firstSeenMap: map };
}
