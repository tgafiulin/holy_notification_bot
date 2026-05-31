export type BotConfig = {
  token: string;
  adminUserId: number;
};

export function loadBotConfig(): BotConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set in .env");
  }

  const adminUserIdRaw = process.env.TELEGRAM_ADMIN_USER_ID?.trim();
  if (!adminUserIdRaw) {
    throw new Error("TELEGRAM_ADMIN_USER_ID is not set in .env");
  }

  const adminUserId = Number(adminUserIdRaw);
  if (!Number.isInteger(adminUserId) || adminUserId <= 0) {
    throw new Error("TELEGRAM_ADMIN_USER_ID must be a positive integer");
  }

  return { token, adminUserId };
}
