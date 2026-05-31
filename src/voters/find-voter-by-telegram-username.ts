import { parseVoterEntry } from "./parse-voter-entry.js";
import { telegramUsernamesEqual } from "./telegram-usernames-equal.js";
import type { VotersFile } from "./types.js";

export function findVotersByTelegramUsername(
  file: VotersFile,
  telegramUsername: string,
): string[] {
  const matches: string[] = [];

  for (const [jeventName, rawEntry] of Object.entries(file.voters)) {
    const record = parseVoterEntry(rawEntry);
    if (!record.username) {
      continue;
    }

    if (telegramUsernamesEqual(record.username, telegramUsername)) {
      matches.push(jeventName);
    }
  }

  return matches;
}
