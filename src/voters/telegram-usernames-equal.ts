import { normalizeTelegramUsername } from "./normalize-telegram-username.js";

export function telegramUsernamesEqual(a: string, b: string): boolean {
  const left = normalizeTelegramUsername(a).toLowerCase();
  const right = normalizeTelegramUsername(b).toLowerCase();

  if (!left || !right) {
    return false;
  }

  return left === right;
}
