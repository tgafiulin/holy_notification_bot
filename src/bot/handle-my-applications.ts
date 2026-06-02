import type { Api, Context } from "grammy";

import { DEFAULT_EVENT_ID } from "../config/constants.js";
import { loadStallConfig } from "../config/stall-config.js";
import { loadReminderState } from "../reminder/reminder-state-io.js";
import { fetchPendingWithSession } from "../services/fetch-pending-with-session.js";
import {
  isStallThresholdDisabled,
  splitPendingByStall,
} from "../stall/stall-filter.js";
import { findVoterNameByTelegramUserId } from "../voters/resolve-known-voter.js";
import { loadVotersRegistry } from "../voters/load-voters.js";
import {
  formatMyApplicationsMessages,
  formatNoPendingApplicationsMessage,
} from "./format-my-applications-messages.js";
import { VOTER_DM_PARSE_MODE } from "./format-voter-dm-messages.js";

type MyApplicationsContext = Pick<Context, "from" | "reply" | "api">;

async function replySessionErrorForVoter(
  ctx: MyApplicationsContext,
  message: string,
): Promise<void> {
  await ctx.reply(
    `❌ ${message}\n\n` + "Обратитесь к администратору бота.",
  );
}

export async function handleMyApplications(ctx: MyApplicationsContext): Promise<void> {
  const from = ctx.from;
  if (!from) {
    return;
  }

  const registry = await loadVotersRegistry();
  const jeventName = findVoterNameByTelegramUserId(registry, from.id);

  if (!jeventName) {
    await ctx.reply(
      "Сначала привяжите аккаунт: нажмите /start с @username из voters.json.",
    );
    return;
  }

  const loadingMessage = await ctx.reply("Загружаю ваши заявки из jEvent…");

  try {
    const fetchResult = await fetchPendingWithSession();

    if (!fetchResult.ok) {
      if (fetchResult.kind === "needs_credentials" || fetchResult.kind === "session_failed") {
        await replySessionErrorForVoter(ctx, fetchResult.message);
        return;
      }

      await ctx.reply(`❌ Ошибка: ${fetchResult.message}`);
      return;
    }

    const voterSummary = fetchResult.summary.byVoter.find(
      (v) => v.voterName === jeventName,
    );
    const pending = voterSummary?.pending ?? [];

    if (pending.length === 0) {
      await ctx.reply(formatNoPendingApplicationsMessage(fetchResult.summary), {
        parse_mode: VOTER_DM_PARSE_MODE,
      });
      return;
    }

    const eventId =
      process.env.JEVENT_EVENT_ID?.trim() || DEFAULT_EVENT_ID;
    const reminderState = await loadReminderState(eventId);
    const stallConfig = loadStallConfig();
    const now = new Date();

    const { stalled, recent } = splitPendingByStall(
      pending,
      stallConfig,
      reminderState.speechFirstSeen ?? {},
      now,
    );

    const messages = formatMyApplicationsMessages(
      fetchResult.summary,
      stalled,
      recent,
      { stallFilterActive: !isStallThresholdDisabled(stallConfig) },
    );

    for (const text of messages) {
      await ctx.reply(text, { parse_mode: VOTER_DM_PARSE_MODE });
    }
  } finally {
    await deleteLoadingMessage(ctx.api, loadingMessage.chat.id, loadingMessage.message_id);
  }
}

async function deleteLoadingMessage(
  api: Api,
  chatId: number,
  messageId: number,
): Promise<void> {
  try {
    await api.deleteMessage(chatId, messageId);
  } catch {
    // message may be too old or already deleted
  }
}
