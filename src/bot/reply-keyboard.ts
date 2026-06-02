import { Keyboard } from "grammy";

export const MY_APPLICATIONS_BUTTON = "Мои заявки" as const;
/** Общая сводка pending по всем голосующим (админ / canViewPoll). */
export const POLL_SUMMARY_BUTTON = "Получить сводку" as const;
export const NOTIFY_VOTERS_BUTTON = "Разослать напоминания" as const;

export function createVoterReplyKeyboard(): Keyboard {
  return new Keyboard().text(MY_APPLICATIONS_BUTTON).resized();
}

export function createPollViewerReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text(POLL_SUMMARY_BUTTON)
    .row()
    .text(MY_APPLICATIONS_BUTTON)
    .resized();
}

export function createAdminReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text(POLL_SUMMARY_BUTTON)
    .text(NOTIFY_VOTERS_BUTTON)
    .row()
    .text(MY_APPLICATIONS_BUTTON)
    .resized();
}
