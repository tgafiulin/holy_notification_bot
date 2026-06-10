export type TeamMemberDto = {
  id?: number;
  enabled?: boolean;
  roles?: string[];
  contributor?: {
    hint?: string;
    roles?: string[] | string;
    profile?: {
      name?: {
        firstName?: string;
        lastName?: string;
      };
      contacts?: {
        email?: { value?: string };
      };
    };
  };
};

export type AssignmentCandidateDto = {
  member?: TeamMemberDto;
};
