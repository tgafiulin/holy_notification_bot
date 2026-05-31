export type VoteType = {
  id: number;
  name: string;
  color: string;
};

export type SpeechVote = {
  id: number;
  comment: string;
  rating: number | null;
  commentDate: number[] | null;
  needToReview: boolean;
  voteType: VoteType | null;
};

export type VoteTOListItem = {
  id: number;
  name: string;
  email: string;
  canVote: boolean;
  sort: number;
  speechVote: SpeechVote | null;
};

export type Speaker = {
  id: number;
  fullName: string;
};

export type Speech = {
  id: number;
  name: string;
  jiraKey: string;
  jiraStatus: string;
  jiraLink: string;
  internalStatusId: number;
  tempSpeakerName: string | null;
  speakers: Speaker[];
  voteTOList: VoteTOListItem[];
};

export type PollingResponse = {
  speeches: Speech[];
  properties: unknown[];
  allJiraStatuses: string[];
};

export type InternalStatus = {
  id: number;
  name: string;
  eventId: number;
  numberOfTalks: number;
  children: InternalStatus[];
};

export type PendingVote = {
  speechId: number;
  speechTitle: string;
  authorNames: string;
  jiraKey: string;
  voterId: number;
  voterName: string;
};

export type VoterPendingSummary = {
  voterId: number;
  voterName: string;
  pending: PendingVote[];
};

export type PcMember = {
  id: number;
  name: string;
  email: string;
  canVote: boolean;
  enabled: boolean;
};
