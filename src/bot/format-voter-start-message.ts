import type { BindTelegramUserResult } from "../voters/bind-telegram-user-id.js";

export function formatAdminBindNote(result: BindTelegramUserResult): string {
  switch (result.status) {
    case "bound":
      return `\n\n✅ Вы привязаны как ${result.jeventName} — личные напоминания будут приходить сюда.`;

    case "already_bound":
      return `\n\nВы уже привязаны как ${result.jeventName}.`;

    case "no_username":
      return (
        "\n\n⚠️ Личные напоминания: задайте @username в Telegram или добавьте telegramUserId в voters.json."
      );

    case "not_found":
      return "";

    case "ambiguous":
      return "\n\n⚠️ Личные напоминания: ваш @username указан у нескольких голосующих в voters.json.";

    case "id_conflict":
      return `\n\n⚠️ Запись «${result.jeventName}» привязана к другому Telegram-аккаунту.`;

    case "file_missing":
      return "";
  }
}

export function formatVoterStartMessage(
  result: BindTelegramUserResult,
  userId: number,
): string {
  switch (result.status) {
    case "bound":
      return (
        "✅ Вы привязаны как " +
        `${result.jeventName}.\n\n` +
        "Напоминания о голосовании будут приходить сюда."
      );

    case "already_bound":
      return (
        "Вы уже привязаны как " +
        `${result.jeventName}.\n\n` +
        "Напоминания о голосовании будут приходить сюда."
      );

    case "no_username":
      return (
        "Не удалось привязать автоматически: у вас не задан @username в Telegram.\n\n" +
        "Задайте username в настройках Telegram или передайте администратору ваш ID:\n" +
        `\`${userId}\``
      );

    case "not_found":
      return (
        "Ваш @username не найден в списке голосующих.\n\n" +
        "Если вы член ПК — попросите администратора добавить вас в voters.json.\n" +
        `Ваш ID: \`${userId}\``
      );

    case "ambiguous":
      return (
        "Не удалось привязать: ваш @username указан у нескольких голосующих.\n\n" +
        "Обратитесь к администратору.\n" +
        `Ваш ID: \`${userId}\``
      );

    case "id_conflict":
      return (
        `Запись «${result.jeventName}» уже привязана к другому Telegram-аккаунту.\n\n` +
        "Обратитесь к администратору.\n" +
        `Ваш ID: \`${userId}\``
      );

    case "file_missing":
      return (
        "Список голосующих ещё не настроен (voters.json).\n\n" +
        "Обратитесь к администратору.\n" +
        `Ваш ID: \`${userId}\``
      );
  }
}
