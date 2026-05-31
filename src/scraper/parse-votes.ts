import type {
  PendingVote,
  PollingResponse,
  Speech,
  VoteTOListItem,
  VoterPendingSummary,
} from "../models/jevent.js";
import { getSpeechAuthorNames } from "./format-speaker-names.js";
import { isVoteComplete } from "./is-vote-complete.js";

export function isEligibleSpeech(
  speech: Speech,
  eligibleInternalStatusId: number,
): boolean {
  if (speech.internalStatusId !== eligibleInternalStatusId) {
    return false;
  }

  if (!speech.voteTOList?.length) {
    return false;
  }

  return true;
}

export function isPendingForVoter(voter: VoteTOListItem): boolean {
  if (!voter.canVote) {
    return false;
  }

  return !isVoteComplete(voter.speechVote);
}

export function collectPendingVotes(
  response: PollingResponse,
  eligibleInternalStatusId: number,
): PendingVote[] {
  const pending: PendingVote[] = [];

  for (const speech of response.speeches) {
    if (!isEligibleSpeech(speech, eligibleInternalStatusId)) {
      continue;
    }

    for (const voter of speech.voteTOList) {
      if (!isPendingForVoter(voter)) {
        continue;
      }

      pending.push({
        speechId: speech.id,
        speechTitle: speech.name,
        authorNames: getSpeechAuthorNames(speech),
        jiraKey: speech.jiraKey,
        voterId: voter.id,
        voterName: voter.name,
      });
    }
  }

  return pending;
}

export function groupPendingByVoter(
  pending: PendingVote[],
): VoterPendingSummary[] {
  const byVoter = new Map<number, VoterPendingSummary>();

  for (const item of pending) {
    const existing = byVoter.get(item.voterId);
    if (existing) {
      existing.pending.push(item);
      continue;
    }

    byVoter.set(item.voterId, {
      voterId: item.voterId,
      voterName: item.voterName,
      pending: [item],
    });
  }

  return [...byVoter.values()].sort((a, b) =>
    a.voterName.localeCompare(b.voterName, "ru"),
  );
}

export function parsePollingResponse(
  response: PollingResponse,
  eligibleInternalStatusId: number,
): {
  pending: PendingVote[];
  byVoter: VoterPendingSummary[];
  eligibleSpeechCount: number;
} {
  const eligibleSpeechCount = response.speeches.filter((speech) =>
    isEligibleSpeech(speech, eligibleInternalStatusId),
  ).length;
  const pending = collectPendingVotes(response, eligibleInternalStatusId);
  const byVoter = groupPendingByVoter(pending);

  return { pending, byVoter, eligibleSpeechCount };
}
