import { Bot, InlineKeyboard } from "grammy";

import {
  ensureJeventSession,
  getCredentialsFromEnv,
} from "../auth/ensure-session.js";
import { fetchPendingWithSession as fetchPendingFromService } from "../services/fetch-pending-with-session.js";
import type { PendingSummary } from "../services/fetch-pending-summary.js";
import { DEFAULT_EVENT_ID } from "../config/constants.js";
import { loadStallConfig } from "../config/stall-config.js";
import { loadReminderState } from "../reminder/reminder-state-io.js";
import { sendVoterNotifications } from "../services/send-voter-notifications.js";
import type { BotConfig } from "./config.js";
import { bindTelegramUserId } from "../voters/bind-telegram-user-id.js";
import { isPollViewer } from "../voters/can-user-view-poll.js";
import { formatVotersSyncNote } from "../voters/format-voters-sync-note.js";
import {
  loadVotersMap,
  loadVotersRegistry,
} from "../voters/load-voters.js";
import { formatNotifyReport } from "./format-notify-report.js";
import {
  formatAdminBindNote,
  formatVoterStartMessage,
} from "./format-voter-start-message.js";
import { notifyAdminVoterStart } from "./notify-admin-voter-start.js";
import {
  formatPendingMessages,
  PENDING_MESSAGE_PARSE_MODE,
} from "./format-pending-messages.js";
import {
  getLoginState,
  resetLoginState,
  setLoginState,
  startLoginPrompt,
} from "./login-state.js";

export const POLL_CALLBACK_DATA = "poll_pending" as const;
export const NOTIFY_CALLBACK_DATA = "notify_voters" as const;

const LOGIN_USERNAME_PROMPT =
  "Сессия jEvent не настроена или истекла.\n\n" +
  "Отправьте логин (username/email) для входа в jEvent:";

const LOGIN_PASSWORD_PROMPT =
  "Теперь отправьте пароль.\n" +
  "Сообщение с паролем будет удалено после проверки.";

function createPollKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("Проверить голосования", POLL_CALLBACK_DATA);
}

function createMainKeyboard(): InlineKeyboard {
  return createPollKeyboard().row().text("Разослать напоминания", NOTIFY_CALLBACK_DATA);
}

function isMainAdmin(ctx: { from?: { id: number } }, adminUserId: number): boolean {
  return ctx.from?.id === adminUserId;
}

async function ensureSessionForBot(): Promise<
  | { ok: true }
  | { ok: false; needsPrompt: true }
  | { ok: false; needsPrompt: false; message: string }
> {
  const result = await ensureJeventSession(getCredentialsFromEnv() ?? undefined);

  if (result.status === "ready") {
    return { ok: true };
  }

  if (result.status === "needs_credentials") {
    return { ok: false, needsPrompt: true };
  }

  return { ok: false, needsPrompt: false, message: result.message };
}

async function promptLogin(ctx: { reply: (text: string) => Promise<unknown> }): Promise<void> {
  startLoginPrompt();
  await ctx.reply(LOGIN_USERNAME_PROMPT);
}

async function fetchPendingWithSession(): Promise<
  | { ok: true; summary: PendingSummary }
  | { ok: false; needsPrompt: true }
  | { ok: false; needsPrompt: false; message: string }
  | { ok: false; error: string }
> {
  const result = await fetchPendingFromService();

  if (result.ok) {
    return { ok: true, summary: result.summary };
  }

  if (result.kind === "needs_credentials") {
    return { ok: false, needsPrompt: true };
  }

  if (result.kind === "session_failed") {
    return { ok: false, needsPrompt: false, message: result.message };
  }

  return { ok: false, error: result.message };
}

async function replySessionError(
  ctx: { from?: { id: number }; reply: (text: string) => Promise<unknown> },
  fetchResult:
    | { ok: false; needsPrompt: true }
    | { ok: false; needsPrompt: false; message: string },
): Promise<void> {
  const viewer = ctx.from?.id != null && (await isPollViewer(ctx.from.id));

  if (viewer) {
    await ctx.reply(
      "❌ Сессия jEvent не настроена или истекла.\n\n" +
        "Обратитесь к администратору бота.",
    );
    return;
  }

  if (fetchResult.needsPrompt) {
    await promptLogin(ctx);
    return;
  }

  startLoginPrompt();
  await ctx.reply(`❌ ${fetchResult.message}\n\n${LOGIN_USERNAME_PROMPT}`);
}

async function handlePollPending(
  ctx: {
    from?: { id: number };
    reply: (text: string, options?: object) => Promise<{ chat: { id: number }; message_id: number }>;
    api: { deleteMessage: (chatId: number, messageId: number) => Promise<unknown> };
  },
  adminUserId: number,
): Promise<void> {
  const loadingMessage = await ctx.reply("Загружаю данные из jEvent…");

  const fetchResult = await fetchPendingWithSession();

  try {
    if (!fetchResult.ok) {
      if ("needsPrompt" in fetchResult) {
        await replySessionError(ctx, fetchResult);
        return;
      }

      await ctx.reply(`❌ Ошибка: ${fetchResult.error}`);
      return;
    }

    if (isMainAdmin(ctx, adminUserId)) {
      await replyVotersSyncNote(ctx, fetchResult.summary.votersAdded);
    }

    const votersMap = await loadVotersMap();
    const messages = formatPendingMessages(fetchResult.summary, votersMap);

    for (const text of messages) {
      await ctx.reply(text, { parse_mode: PENDING_MESSAGE_PARSE_MODE });
    }
  } finally {
    await ctx.api.deleteMessage(
      loadingMessage.chat.id,
      loadingMessage.message_id,
    );
  }
}

async function replyVotersSyncNote(
  ctx: { reply: (text: string) => Promise<unknown> },
  added: string[],
): Promise<void> {
  const note = formatVotersSyncNote(added);
  if (note) {
    await ctx.reply(note);
  }
}

export function createBot(config: BotConfig): Bot {
  const bot = new Bot(config.token);

  bot.command("start", async (ctx) => {
    const from = ctx.from;
    if (!from) {
      return;
    }

    const bindResult = await bindTelegramUserId(from.username, from.id);

    if (!isMainAdmin(ctx, config.adminUserId)) {
      await notifyAdminVoterStart(ctx.api, config.adminUserId, from, bindResult);

      if (await isPollViewer(from.id)) {
        await ctx.reply(
          "Бот напоминаний о голосовании по заявкам HolyJS.\n\n" +
            "Доступна сводка непроголосованных по заявкам.",
          { reply_markup: createPollKeyboard() },
        );
        return;
      }

      await ctx.reply(formatVoterStartMessage(bindResult, from.id), {
        parse_mode: "Markdown",
      });
      return;
    }

    const session = await ensureSessionForBot();
    const bindNote = formatAdminBindNote(bindResult);

    if (session.ok) {
      await ctx.reply(
        "Бот напоминаний о голосовании по заявкам HolyJS.\n\n" +
          "Проверка — сводка в этот чат.\n" +
          "Рассылка — личные напоминания голосующим (привязка по /start и username в voters.json)." +
          bindNote,
        { reply_markup: createMainKeyboard() },
      );
      return;
    }

    if (session.needsPrompt) {
      await promptLogin(ctx);
      return;
    }

    startLoginPrompt();
    await ctx.reply(`❌ ${session.message}\n\n${LOGIN_USERNAME_PROMPT}`);
  });

  bot.use(async (ctx, next) => {
    if (isMainAdmin(ctx, config.adminUserId)) {
      await next();
      return;
    }

    const userId = ctx.from?.id;
    if (
      userId != null &&
      (await isPollViewer(userId)) &&
      ctx.callbackQuery?.data === POLL_CALLBACK_DATA
    ) {
      await next();
      return;
    }

    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: "Нет доступа" });
      return;
    }

    if (ctx.message?.text && !ctx.message.text.startsWith("/start")) {
      await ctx.reply("Нет доступа");
    }
  });

  bot.command("login", async (ctx) => {
    resetLoginState();
    await promptLogin(ctx);
  });

  bot.on("message:text", async (ctx, next) => {
    const loginState = getLoginState();
    if (loginState.step === "idle") {
      await next();
      return;
    }

    const text = ctx.message.text.trim();
    if (!text || text.startsWith("/")) {
      await ctx.reply("Ожидается логин или пароль, не команда.");
      return;
    }

    if (loginState.step === "awaiting_username") {
      setLoginState({ step: "awaiting_password", username: text });
      await ctx.reply(LOGIN_PASSWORD_PROMPT);
      return;
    }

    const username = loginState.username;
    if (!username) {
      resetLoginState();
      await promptLogin(ctx);
      return;
    }

    try {
      await ctx.deleteMessage();
    } catch {
      // message may be too old or already deleted
    }

    const loginResult = await ensureJeventSession(
      { username, password: text },
      { headless: true },
    );

    resetLoginState();

    if (loginResult.status === "ready") {
      await ctx.reply(
        "✅ Вход в jEvent выполнен. Сессия сохранена.\n\n" +
          "Теперь можно проверять голосования и рассылать напоминания.",
        { reply_markup: createMainKeyboard() },
      );
      return;
    }

    const message =
      loginResult.status === "failed"
        ? loginResult.message
        : "Не удалось выполнить вход";

    startLoginPrompt();
    await ctx.reply(`❌ ${message}\n\n${LOGIN_USERNAME_PROMPT}`);
  });

  bot.callbackQuery(POLL_CALLBACK_DATA, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handlePollPending(ctx, config.adminUserId);
  });

  bot.callbackQuery(NOTIFY_CALLBACK_DATA, async (ctx) => {
    await ctx.answerCallbackQuery();

    const loadingMessage = await ctx.reply("Загружаю данные и рассылаю напоминания…");

    const fetchResult = await fetchPendingWithSession();

    try {
      if (!fetchResult.ok) {
        if ("needsPrompt" in fetchResult) {
          await replySessionError(ctx, fetchResult);
          return;
        }

        await ctx.reply(`❌ Ошибка: ${fetchResult.error}`);
        return;
      }

      await replyVotersSyncNote(ctx, fetchResult.summary.votersAdded);

      const registry = await loadVotersRegistry();
      const eventId =
        process.env.JEVENT_EVENT_ID?.trim() || DEFAULT_EVENT_ID;
      const reminderState = await loadReminderState(eventId);
      const notifyResult = await sendVoterNotifications(
        ctx.api,
        fetchResult.summary,
        registry,
        {
          stallConfig: loadStallConfig(),
          speechFirstSeen: reminderState.speechFirstSeen ?? {},
        },
      );

      await ctx.reply(formatNotifyReport(notifyResult), {
        parse_mode: PENDING_MESSAGE_PARSE_MODE,
      });
    } finally {
      await ctx.api.deleteMessage(
        loadingMessage.chat.id,
        loadingMessage.message_id,
      );
    }
  });

  bot.catch((error) => {
    console.error("Bot error:", error);
  });

  return bot;
}
