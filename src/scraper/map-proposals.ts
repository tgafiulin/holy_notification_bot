import type {
  LocalizedField,
  PaginatedResponse,
  ProposalAssignmentDto,
  ProposalDto,
  ProposalMemberDto,
} from "../api/proposals.js";
import {
  ELIGIBLE_CUSTOM_STATUS,
  VOTING_ASSIGNMENT_KIND,
} from "../config/constants.js";
import type { Proposal, VoterAssignment } from "../models/program.js";

const COMPLETE_ASSIGNMENT_STATUS = "DONE";
const PENDING_ASSIGNMENT_STATUS = "ACTIVE";

function localizedName(value: LocalizedField): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return (value.ru ?? value.en ?? "").trim();
}

function parseIsoDateTime(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getStatusChangedAt(workflow: ProposalDto["workflow"]): string | null {
  const history = workflow?.statusHistory;
  if (!history?.length) {
    return null;
  }

  return parseIsoDateTime(history[history.length - 1]?.createdAt);
}

function getSpeakerNames(members: ProposalMemberDto[] | undefined): string {
  const speakers = (members ?? [])
    .filter((member) => member.role === "SPEAKER")
    .map((member) => {
      const data = member.eventProfile?.biography?.content?.data;
      const first = localizedName(data?.firstName);
      const last = localizedName(data?.lastName);
      return [first, last].filter(Boolean).join(" ");
    })
    .filter(Boolean);

  return speakers.length > 0 ? speakers.join(", ") : "—";
}

function mapAssignment(
  assignment: ProposalAssignmentDto,
  voterName: string,
): VoterAssignment | null {
  const voterId = assignment.assigneeId;
  if (
    assignment.kind !== VOTING_ASSIGNMENT_KIND ||
    voterId == null ||
    (assignment.status !== PENDING_ASSIGNMENT_STATUS &&
      assignment.status !== COMPLETE_ASSIGNMENT_STATUS)
  ) {
    return null;
  }

  const isPending = assignment.status === PENDING_ASSIGNMENT_STATUS;

  return {
    voterId,
    voterName,
    canVote: true,
    pending: isPending,
    completedAt: isPending ? null : parseIsoDateTime(assignment.finishedAt),
  };
}

function mapProposal(
  proposal: ProposalDto,
  voterNameByMemberId: Map<number, string>,
): Proposal | null {
  if (proposal.workflow?.customStatus !== ELIGIBLE_CUSTOM_STATUS) {
    return null;
  }

  const assignments = (proposal.assignments ?? [])
    .map((assignment) => {
      const voterId = assignment.assigneeId;
      if (voterId == null) {
        return null;
      }

      const voterName = voterNameByMemberId.get(voterId);
      if (!voterName) {
        return null;
      }

      return mapAssignment(assignment, voterName);
    })
    .filter((item): item is VoterAssignment => item != null);

  if (assignments.length === 0) {
    return null;
  }

  const workflow = proposal.workflow;

  return {
    id: proposal.id,
    title: proposal.activity?.hint?.trim() ?? `Proposal ${proposal.id}`,
    jiraKey: workflow?.task ?? "",
    jiraStatus: workflow?.statusHint ?? workflow?.status ?? "",
    speakers: getSpeakerNames(proposal.members),
    statusChangedAt: getStatusChangedAt(workflow),
    assignments,
  };
}

export function mapProposals(
  response: PaginatedResponse<ProposalDto>,
  voterNameByMemberId: Map<number, string>,
): Proposal[] {
  return response.data
    .map((proposal) => mapProposal(proposal, voterNameByMemberId))
    .filter((proposal): proposal is Proposal => proposal != null);
}
