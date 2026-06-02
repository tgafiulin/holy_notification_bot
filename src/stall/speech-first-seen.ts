import { parseJeventDateTimeArray } from "../scraper/parse-jevent-datetime.js";
import type { PendingVote } from "../models/jevent.js";
import type { SpeechFirstSeenRecord } from "../reminder/types.js";

export type SpeechFirstSeenMap = Record<string, SpeechFirstSeenRecord>;

export function ensureSpeechFirstSeen(
  map: SpeechFirstSeenMap,
  speechId: number,
  now: Date,
): SpeechFirstSeenMap {
  const key = String(speechId);
  if (map[key]) {
    return map;
  }

  return {
    ...map,
    [key]: { firstSeenAt: now.toISOString() },
  };
}

export function resolveInReviewSince(
  vote: Pick<PendingVote, "speechId" | "lastStatusUpdate">,
  firstSeenMap: SpeechFirstSeenMap,
  now: Date,
): Date | null {
  const fromApi = parseJeventDateTimeArray(vote.lastStatusUpdate);
  if (fromApi != null) {
    return fromApi;
  }

  const key = String(vote.speechId);
  const record = firstSeenMap[key];
  if (record) {
    return new Date(record.firstSeenAt);
  }

  return now;
}
