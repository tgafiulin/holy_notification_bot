export const TELEGRAM_MESSAGE_LIMIT = 4096;

export type SplitTelegramMessagesOptions = {
  prefix: string;
  parts: string[];
  suffix?: string;
  limit?: number;
};

/**
 * Разбивает длинный текст на сообщения ≤ limit с учётом suffix на последнем чанке.
 * Части без ведущего `\n` получают `\n` перед склейкой; при переполнении новый чанк — trimStart(part).
 */
export function splitTelegramMessages({
  prefix,
  parts,
  suffix = "",
  limit = TELEGRAM_MESSAGE_LIMIT,
}: SplitTelegramMessagesOptions): string[] {
  const messages: string[] = [];
  let current = prefix;

  for (const part of parts) {
    const block = part.startsWith("\n") || part === "" ? part : `\n${part}`;

    if (current.length + block.length + suffix.length > limit) {
      if (current.trim()) {
        messages.push(current.trimEnd());
      }
      current = block.trimStart();
      continue;
    }

    current += block;
  }

  if (current.trim()) {
    messages.push((current + suffix).trimEnd());
  }

  return messages;
}
