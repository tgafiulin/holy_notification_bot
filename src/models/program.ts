export type CommitteeMember = {
  id: number;
  name: string;
  email: string;
  canVote: boolean;
  enabled: boolean;
};

export type VoterAssignment = {
  voterId: number;
  voterName: string;
  canVote: boolean;
  pending: boolean;
  /** Когда назначение стало ACTIVE (для расчёта застоя). */
  pendingSince: string | null;
  completedAt: string | null;
};

export type Proposal = {
  id: number;
  title: string;
  jiraKey: string;
  jiraStatus: string;
  speakers: string;
  assignments: VoterAssignment[];
};

export type PendingAssignment = {
  proposalId: number;
  proposalTitle: string;
  authorNames: string;
  jiraKey: string;
  voterId: number;
  voterName: string;
  /** С какой даты ждём голос (assignment.updatedAt для ACTIVE). */
  pendingSince: string | null;
};

export type VoterPendingSummary = {
  voterId: number;
  voterName: string;
  pending: PendingAssignment[];
};
