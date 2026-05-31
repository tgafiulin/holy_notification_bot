import type { Api } from "grammy";

import type { BindTelegramUserResult } from "../voters/bind-telegram-user-id.js";
import { resolveKnownVoter } from "../voters/resolve-known-voter.js";

function formatAdminVoterStartNotice(info: {
  jeventName: string;
  telegramUserId: number;
  telegramUsername?: string;
  bindStatus?: "bound" | "already_bound";
}): string {
  const usernamePart = info.telegramUsername
    ? `@${info.telegramUsername}`
    : "без @username";
  const bindNote =
    info.bindStatus === "bound"
      ? "\nПривязка telegramUserId выполнена."
      : "";

  return (
    `👤 ${info.jeventName} нажал /start\n` +
    `${usernamePart} · id ${info.telegramUserId}` +
    bindNote
  );
}

export async function notifyAdminVoterStart(
  api: Api,
  adminUserId: number,
  from: { id: number; username?: string },
  bindResult: BindTelegramUserResult,
): Promise<void> {
  if (from.id === adminUserId) {
    return;
  }

  const known = await resolveKnownVoter(
    bindResult,
    from.id,
    from.username,
  );

  if (!known) {
    return;
  }

  try {
    await api.sendMessage(
      adminUserId,
      formatAdminVoterStartNotice({
        jeventName: known.jeventName,
        telegramUserId: from.id,
        telegramUsername: from.username,
        bindStatus: known.bindStatus,
      }),
    );
  } catch (error) {
    console.error("Failed to notify admin about voter /start:", error);
  }
}
