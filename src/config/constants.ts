/**
 * Внутренний статус заявки (internal status), по которому нужны напоминания.
 * Это НЕ jiraStatus: в API jiraStatus может быть «Рассмотрение заявки»,
 * а «Ревью ПК» — дочерний internal status (internalStatusId).
 */
export const ELIGIBLE_INTERNAL_STATUS_NAME = "Ревью ПК" as const;

/** voteType.name при выборе «Воздержался» — считается проголосовавшим. */
export const ABSTAINED_VOTE_TYPE_NAME = "Воздержался" as const;

/** jEvent event id (HolyJS). Смена — правка здесь и деплой. */
export const DEFAULT_EVENT_ID = "100924";

/** IANA timezone для слотов напоминаний и расчёта застоя. */
export const DEFAULT_TIMEZONE = "Europe/Moscow";
