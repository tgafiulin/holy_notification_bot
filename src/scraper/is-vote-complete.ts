import { ABSTAINED_VOTE_TYPE_NAME } from "../config/constants.js";
import type { SpeechVote } from "../models/jevent.js";

/**
 * Определяет, считается ли голос завершённым.
 *
 * needToReview намеренно не используется: голосующий снимает флаг вручную
 * и может забыть, оставив needToReview=true при уже выставленном голосе.
 *
 * Проголосовал, если:
 * - выбран voteType (включая «Воздержался»);
 * - или выставлен rating;
 * - или оставлен непустой comment.
 */
export function isVoteComplete(speechVote: SpeechVote | null | undefined): boolean {
  if (!speechVote) {
    return false;
  }

  if (speechVote.voteType != null) {
    return true;
  }

  if (speechVote.rating != null) {
    return true;
  }

  if (speechVote.comment.trim().length > 0) {
    return true;
  }

  return false;
}

export function isAbstained(speechVote: SpeechVote | null | undefined): boolean {
  return speechVote?.voteType?.name === ABSTAINED_VOTE_TYPE_NAME;
}
