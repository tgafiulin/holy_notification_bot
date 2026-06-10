import { isMappedTelegramUsername } from "./is-mapped-telegram-username.js";
import { normalizeTelegramUsername } from "./normalize-telegram-username.js";
import type { VoterFileEntry, VoterRecord } from "./types.js";

function parseTelegramUserId(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw <= 0) {
    return null;
  }

  return raw;
}

function parseMemberId(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw <= 0) {
    return null;
  }

  return raw;
}

export function parseVoterEntry(raw: VoterFileEntry): VoterRecord {
  if (typeof raw === "string") {
    const username = normalizeTelegramUsername(raw);
    return {
      username: isMappedTelegramUsername(username) ? username : null,
      telegramUserId: null,
      memberId: null,
      canViewPoll: false,
    };
  }

  const username = normalizeTelegramUsername(String(raw.username ?? ""));

  return {
    username: isMappedTelegramUsername(username) ? username : null,
    telegramUserId: parseTelegramUserId(raw.telegramUserId),
    memberId: parseMemberId(raw.memberId),
    canViewPoll: raw.canViewPoll === true,
  };
}
