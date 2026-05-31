export type VoterFileEntry =
  | string
  | {
      username?: string;
      telegramUserId?: number | null;
      canViewPoll?: boolean;
    };

export type VotersFile = {
  version?: number;
  voters: Record<string, VoterFileEntry>;
};

export type VoterRecord = {
  username: string | null;
  telegramUserId: number | null;
  canViewPoll: boolean;
};

/** Имя jEvent → username + telegramUserId для DM. */
export type VotersRegistry = Map<string, VoterRecord>;

/** Имя jEvent → Telegram username (только для ссылок в ответе админу). */
export type VotersMap = Map<string, string>;
