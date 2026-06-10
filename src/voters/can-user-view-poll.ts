import type { VotersRegistry } from "./types.js";
import { loadVotersRegistry } from "./load-voters.js";

export function canUserViewPoll(
  userId: number,
  registry: VotersRegistry,
): boolean {
  for (const record of registry.values()) {
    if (record.telegramUserId === userId && record.canViewPoll) {
      return true;
    }
  }

  return false;
}

export async function isPollViewer(userId: number): Promise<boolean> {
  const registry = await loadVotersRegistry();
  return canUserViewPoll(userId, registry);
}

/** Админ + пользователи с canViewPoll и привязанным Telegram. */
export function collectPollReportRecipientIds(
  adminUserId: number,
  registry: VotersRegistry,
): number[] {
  const ids = new Set<number>([adminUserId]);

  for (const record of registry.values()) {
    if (record.canViewPoll && record.telegramUserId != null) {
      ids.add(record.telegramUserId);
    }
  }

  return [...ids];
}
