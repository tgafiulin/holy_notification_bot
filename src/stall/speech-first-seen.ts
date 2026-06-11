import type { PendingAssignment } from "../models/program.js";
import type { SpeechFirstSeenRecord } from "../reminder/types.js";

export type SpeechFirstSeenMap = Record<string, SpeechFirstSeenRecord>;

export function ensureSpeechFirstSeen(
  map: SpeechFirstSeenMap,
  proposalId: number,
  now: Date,
): SpeechFirstSeenMap {
  const key = String(proposalId);
  if (map[key]) {
    return map;
  }

  return {
    ...map,
    [key]: { firstSeenAt: now.toISOString() },
  };
}

export function resolveInReviewSince(
  item: Pick<PendingAssignment, "proposalId" | "pendingSince">,
  firstSeenMap: SpeechFirstSeenMap,
  now: Date,
): Date | null {
  if (item.pendingSince) {
    const fromApi = new Date(item.pendingSince);
    if (!Number.isNaN(fromApi.getTime())) {
      return fromApi;
    }
  }

  const key = String(item.proposalId);
  const record = firstSeenMap[key];
  if (record) {
    return new Date(record.firstSeenAt);
  }

  return now;
}
