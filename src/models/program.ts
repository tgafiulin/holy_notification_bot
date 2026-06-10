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
  completedAt: string | null;
};

export type Proposal = {
  id: number;
  title: string;
  jiraKey: string;
  jiraStatus: string;
  speakers: string;
  statusChangedAt: string | null;
  assignments: VoterAssignment[];
};

export type PendingAssignment = {
  proposalId: number;
  proposalTitle: string;
  authorNames: string;
  jiraKey: string;
  voterId: number;
  voterName: string;
  statusChangedAt: string | null;
};

export type VoterPendingSummary = {
  voterId: number;
  voterName: string;
  pending: PendingAssignment[];
};
