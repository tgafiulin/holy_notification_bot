import type { BindTelegramUserResult } from "./bind-telegram-user-id.js";
import { findVotersByTelegramUsername } from "./find-voter-by-telegram-username.js";
import { loadVotersRegistry } from "./load-voters.js";
import { readVotersFile } from "./voters-file-io.js";
import type { VotersRegistry } from "./types.js";

export function findVoterNameByTelegramUserId(
  registry: VotersRegistry,
  telegramUserId: number,
): string | null {
  for (const [jeventName, record] of registry) {
    if (record.telegramUserId === telegramUserId) {
      return jeventName;
    }
  }

  return null;
}

export async function resolveKnownVoter(
  bindResult: BindTelegramUserResult,
  telegramUserId: number,
  telegramUsername?: string,
): Promise<{ jeventName: string; bindStatus?: "bound" | "already_bound" } | null> {
  if (bindResult.status === "bound" || bindResult.status === "already_bound") {
    return {
      jeventName: bindResult.jeventName,
      bindStatus: bindResult.status,
    };
  }

  const registry = await loadVotersRegistry();
  const byUserId = findVoterNameByTelegramUserId(registry, telegramUserId);
  if (byUserId) {
    return { jeventName: byUserId };
  }

  if (!telegramUsername) {
    return null;
  }

  const file = await readVotersFile();
  if (!file) {
    return null;
  }

  const matches = findVotersByTelegramUsername(file, telegramUsername);
  if (matches.length === 1) {
    return { jeventName: matches[0] };
  }

  return null;
}
