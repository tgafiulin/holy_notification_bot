import type { StallConfig } from "../config/stall-config.js";
import type { PendingVote } from "../models/jevent.js";
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
  vote: PendingVote,
  config: StallConfig,
  firstSeenMap: SpeechFirstSeenMap,
  now: Date,
): boolean {
  if (isStallThresholdDisabled(config)) {
    return true;
  }

  const since = resolveInReviewSince(vote, firstSeenMap, now);
  if (since == null) {
    return false;
  }

  const days = calendarDaysBetweenInTimeZone(since, now, config.timeZone);
  return days >= config.thresholdDays;
}

export function filterStalledPending(
  pending: PendingVote[],
  config: StallConfig,
  firstSeenMap: SpeechFirstSeenMap,
  now: Date,
): { stalled: PendingVote[]; firstSeenMap: SpeechFirstSeenMap } {
  if (isStallThresholdDisabled(config)) {
    return { stalled: pending, firstSeenMap };
  }

  let map = firstSeenMap;
  const stalled: PendingVote[] = [];

  for (const vote of pending) {
    if (vote.lastStatusUpdate == null) {
      map = ensureSpeechFirstSeen(map, vote.speechId, now);
    }

    if (isStalledPending(vote, config, map, now)) {
      stalled.push(vote);
    }
  }

  return { stalled, firstSeenMap: map };
}

export const STALL_SKIP_REASON = "ниже порога застоя";
