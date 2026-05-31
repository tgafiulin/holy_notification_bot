import { normalizeTelegramUsername } from "./normalize-telegram-username.js";

/** Значение-заглушка в voters.example.json — ссылку не строим. */
export const PLACEHOLDER_TELEGRAM_USERNAME = "example_username";

export function isMappedTelegramUsername(raw: string): boolean {
  const username = normalizeTelegramUsername(raw);
  if (!username) {
    return false;
  }

  return username.toLowerCase() !== PLACEHOLDER_TELEGRAM_USERNAME;
}
