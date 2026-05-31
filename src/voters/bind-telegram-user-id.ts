import { parseVoterEntry } from "./parse-voter-entry.js";
import { findVotersByTelegramUsername } from "./find-voter-by-telegram-username.js";
import { normalizeTelegramUsername } from "./normalize-telegram-username.js";
import type { VoterFileEntry, VotersFile } from "./types.js";
import { readVotersFile, writeVotersFile } from "./voters-file-io.js";

export type BindTelegramUserResult =
  | { status: "bound"; jeventName: string }
  | { status: "already_bound"; jeventName: string }
  | { status: "no_username" }
  | { status: "not_found" }
  | { status: "ambiguous"; jeventNames: string[] }
  | { status: "id_conflict"; jeventName: string; existingUserId: number }
  | { status: "file_missing" };

function entryTelegramUserId(raw: VoterFileEntry): number | null {
  return parseVoterEntry(raw).telegramUserId;
}

function toBoundEntry(raw: VoterFileEntry, telegramUserId: number): VoterFileEntry {
  if (typeof raw === "string") {
    return {
      username: normalizeTelegramUsername(raw),
      telegramUserId,
    };
  }

  return {
    ...raw,
    telegramUserId,
  };
}

export async function bindTelegramUserId(
  telegramUsername: string | undefined,
  telegramUserId: number,
): Promise<BindTelegramUserResult> {
  const normalizedUsername = normalizeTelegramUsername(telegramUsername ?? "");
  if (!normalizedUsername) {
    return { status: "no_username" };
  }

  const file = await readVotersFile();
  if (!file) {
    return { status: "file_missing" };
  }

  const matches = findVotersByTelegramUsername(file, normalizedUsername);

  if (matches.length === 0) {
    return { status: "not_found" };
  }

  if (matches.length > 1) {
    return { status: "ambiguous", jeventNames: matches };
  }

  const jeventName = matches[0];
  const rawEntry = file.voters[jeventName];
  const existingUserId = entryTelegramUserId(rawEntry);

  if (existingUserId === telegramUserId) {
    return { status: "already_bound", jeventName };
  }

  if (existingUserId != null && existingUserId !== telegramUserId) {
    return {
      status: "id_conflict",
      jeventName,
      existingUserId,
    };
  }

  file.voters[jeventName] = toBoundEntry(rawEntry, telegramUserId);
  file.version = Math.max(file.version ?? 1, 2);

  await writeVotersFile(file);

  return { status: "bound", jeventName };
}
