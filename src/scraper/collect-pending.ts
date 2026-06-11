import type {
  PendingAssignment,
  Proposal,
  VoterPendingSummary,
} from "../models/program.js";

export function collectPending(proposals: Proposal[]): PendingAssignment[] {
  const pending: PendingAssignment[] = [];

  for (const proposal of proposals) {
    for (const assignment of proposal.assignments) {
      if (!assignment.canVote || !assignment.pending) {
        continue;
      }

      pending.push({
        proposalId: proposal.id,
        proposalTitle: proposal.title,
        authorNames: proposal.speakers,
        jiraKey: proposal.jiraKey,
        voterId: assignment.voterId,
        voterName: assignment.voterName,
        pendingSince: assignment.pendingSince,
      });
    }
  }

  return pending;
}

export function groupPendingByVoter(
  pending: PendingAssignment[],
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

export function summarizePending(proposals: Proposal[]): {
  pending: PendingAssignment[];
  byVoter: VoterPendingSummary[];
  eligibleProposalCount: number;
} {
  const eligibleProposalCount = proposals.length;
  const pending = collectPending(proposals);
  const byVoter = groupPendingByVoter(pending);

  return { pending, byVoter, eligibleProposalCount };
}
