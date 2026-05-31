import { telegramProfileUrl } from "./normalize-telegram-username.js";
import type { VotersMap } from "./types.js";

export function formatVoterLabelHtml(
  voterName: string,
  votersMap: VotersMap,
  escapeHtml: (text: string) => string,
): string {
  const escapedName = escapeHtml(voterName);
  const username = votersMap.get(voterName);

  if (!username) {
    return `<b>${escapedName}</b>`;
  }

  const url = telegramProfileUrl(username);
  const linkText = escapeHtml(`@${username}`);

  return `<b>${escapedName}</b> <a href="${url}">${linkText}</a>`;
}
