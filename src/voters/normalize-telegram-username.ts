export function normalizeTelegramUsername(raw: string): string {
  let value = raw.trim();
  if (!value) {
    return "";
  }

  if (value.startsWith("@")) {
    value = value.slice(1);
  }

  const tmeMatch = /^https?:\/\/(?:www\.)?t\.me\/([a-zA-Z0-9_]+)\/?$/i.exec(value);
  if (tmeMatch) {
    return tmeMatch[1];
  }

  return value;
}

export function telegramProfileUrl(username: string): string {
  return `https://t.me/${username}`;
}
