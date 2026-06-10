/** UI-название статуса для сообщений бота. */
export const STATUS_LABEL_VOTING = "Голосование" as const;

/** workflow.customStatus заявок в голосовании. */
export const ELIGIBLE_CUSTOM_STATUS = "voting" as const;

/** Тип назначения в assignments = голос ПК. */
export const VOTING_ASSIGNMENT_KIND = "REVIEWER" as const;

/** ЛКО event id (HolyJS). Смена — правка здесь и деплой. */
export const DEFAULT_EVENT_ID = "150111";

/** IANA timezone для слотов напоминаний и расчёта застоя. */
export const DEFAULT_TIMEZONE = "Europe/Moscow";
