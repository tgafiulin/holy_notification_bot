import { Bot, InlineKeyboard } from "grammy";

import {
  ensureJeventSession,
  getCredentialsFromEnv,
} from "../auth/ensure-session.js";
import { createAuthenticatedClient } from "../auth/authenticated-client.js";
import { fetchPendingSummary } from "../services/fetch-pending-summary.js";
import type { BotConfig } from "./config.js";
import { formatPendingMessages, PENDING_MESSAGE_PARSE_MODE } from "./format-pending-messages.js";
import {
  getLoginState,
  resetLoginState,
  setLoginState,
  startLoginPrompt,
} from "./login-state.js";

export const POLL_CALLBACK_DATA = "poll_pending" as const;

const LOGIN_USERNAME_PROMPT =
  "Сессия jEvent не настроена или истекла.\n\n" +
  "Отправьте логин (username/email) для входа в jEvent:";

const LOGIN_PASSWORD_PROMPT =
  "Теперь отправьте пароль.\n" +
  "Сообщение с паролем будет удалено после проверки.";

function createPollKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text(
    "Проверить голосования",
    POLL_CALLBACK_DATA,
  );
}

function isAdmin(ctx: { from?: { id: number } }, adminUserId: number): boolean {
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

export function createBot(config: BotConfig): Bot {
  const bot = new Bot(config.token);

  bot.use(async (ctx, next) => {
    if (!isAdmin(ctx, config.adminUserId)) {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: "Нет доступа" });
      } else if (ctx.message) {
        await ctx.reply("Нет доступа");
      }
      return;
    }

    await next();
  });

  bot.command("start", async (ctx) => {
    const session = await ensureSessionForBot();

    if (session.ok) {
      await ctx.reply(
        "Бот напоминаний о голосовании по заявкам HolyJS.\n\n" +
          "Нажмите кнопку, чтобы загрузить актуальный список непроголосованных.",
        { reply_markup: createPollKeyboard() },
      );
      return;
    }

    if (session.needsPrompt) {
      await promptLogin(ctx);
      return;
    }

    startLoginPrompt();
    await ctx.reply(
      `❌ ${session.message}\n\n${LOGIN_USERNAME_PROMPT}`,
    );
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
          "Теперь можно проверять голосования.",
        { reply_markup: createPollKeyboard() },
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

    const session = await ensureSessionForBot();
    if (!session.ok) {
      if (session.needsPrompt) {
        await promptLogin(ctx);
      } else {
        startLoginPrompt();
        await ctx.reply(`❌ ${session.message}\n\n${LOGIN_USERNAME_PROMPT}`);
      }
      return;
    }

    const loadingMessage = await ctx.reply("Загружаю данные из jEvent…");

    let client: Awaited<ReturnType<typeof createAuthenticatedClient>> | undefined;

    try {
      client = await createAuthenticatedClient();
      const summary = await fetchPendingSummary(client.request);
      const messages = formatPendingMessages(summary);

      for (const text of messages) {
        await ctx.reply(text, { parse_mode: PENDING_MESSAGE_PARSE_MODE });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Неизвестная ошибка";

      if (message.includes("No saved session")) {
        await promptLogin(ctx);
        return;
      }

      await ctx.reply(`❌ Ошибка: ${message}`);
    } finally {
      await client?.dispose();
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
