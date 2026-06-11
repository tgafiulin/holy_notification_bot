export type LocalizedField = string | { ru?: string; en?: string } | null | undefined;

export type PaginatedResponse<T> = {
  data: T[];
  total?: number;
  totalElements?: number;
};

export type ProposalWorkflowDto = {
  task?: string;
  stage?: string;
  status?: string;
  statusHint?: string;
  customStatus?: string | null;
  statusHistory?: Array<{ status?: string; createdAt?: string }>;
};

export type ProposalAssignmentDto = {
  id?: number;
  proposalId?: number;
  assigneeId?: number;
  kind?: string;
  status?: string;
  finishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ProposalMemberDto = {
  role?: string;
  eventProfile?: {
    biography?: {
      content?: {
        data?: {
          firstName?: LocalizedField;
          lastName?: LocalizedField;
        };
      };
    };
  };
};

export type ProposalDto = {
  id: number;
  eventId?: number;
  workflow?: ProposalWorkflowDto;
  activity?: {
    hint?: string;
  };
  members?: ProposalMemberDto[];
  assignments?: ProposalAssignmentDto[];
};
