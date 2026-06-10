export type VoterFileEntry =
  | string
  | {
      username?: string;
      telegramUserId?: number | null;
      /** ЛКО team member id (= assignments.assigneeId, votes[].voterId) */
      memberId?: number | null;
      canViewPoll?: boolean;
    };

export type VotersFile = {
  version?: number;
  voters: Record<string, VoterFileEntry>;
};

export type VoterRecord = {
  username: string | null;
  telegramUserId: number | null;
  memberId: number | null;
  canViewPoll: boolean;
};

/** Имя ЛКО → username + telegramUserId для DM. */
export type VotersRegistry = Map<string, VoterRecord>;

/** Имя ЛКО → Telegram username (только для ссылок в ответе админу). */
export type VotersMap = Map<string, string>;
