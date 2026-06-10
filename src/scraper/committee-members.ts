import type { AssignmentCandidateDto, TeamMemberDto } from "../api/team-members.js";
import type { CommitteeMember } from "../models/program.js";
import type { VoterRecord, VotersRegistry } from "../voters/types.js";

export const PC_ROLE = "PROGRAM_COMMITTEE";

export type TeamMember = TeamMemberDto;

function normalizeRoles(roles: string[] | string | undefined): string[] {
  if (Array.isArray(roles)) {
    return roles;
  }

  if (typeof roles === "string" && roles.length > 0) {
    return [roles];
  }

  return [];
}

export function normalizeMemberList(items: unknown[]): TeamMember[] {
  return items
    .map((item) => {
      if (item && typeof item === "object" && "member" in item) {
        return (item as AssignmentCandidateDto).member;
      }

      return item as TeamMember;
    })
    .filter((member): member is TeamMember => member != null && member.id != null);
}

export function getMemberRoles(member: TeamMember): string[] {
  return normalizeRoles(member.contributor?.roles ?? member.roles);
}

export function getMemberDisplayName(member: TeamMember): string {
  const hint = member.contributor?.hint?.trim();
  if (hint) {
    return hint;
  }

  const profile = member.contributor?.profile?.name;
  if (!profile) {
    return "";
  }

  return [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
}

export function hasPcRole(member: TeamMember): boolean {
  return getMemberRoles(member).includes(PC_ROLE);
}

export function isActivePcMember(member: TeamMember | undefined): boolean {
  if (!member?.id) {
    return false;
  }

  if (member.enabled === false) {
    return false;
  }

  return hasPcRole(member);
}

function memberToCommitteeMember(member: TeamMember): CommitteeMember | null {
  const name = getMemberDisplayName(member);
  if (!member.id || !name) {
    return null;
  }

  return {
    id: member.id,
    name,
    email: member.contributor?.profile?.contacts?.email?.value?.trim() ?? "",
    canVote: true,
    enabled: member.enabled ?? true,
  };
}

export function mapMemberListToCommitteeMembers(items: unknown[]): CommitteeMember[] {
  const seen = new Set<number>();

  return normalizeMemberList(items)
    .filter((member) => isActivePcMember(member))
    .map((member) => memberToCommitteeMember(member))
    .filter((member): member is CommitteeMember => member != null)
    .filter((member) => {
      if (seen.has(member.id)) {
        return false;
      }
      seen.add(member.id);
      return true;
    });
}

export function findVoterRecordByMemberId(
  registry: VotersRegistry,
  memberId: number,
): { jeventName: string; record: VoterRecord } | null {
  for (const [jeventName, record] of registry) {
    if (record.memberId === memberId) {
      return { jeventName, record };
    }
  }

  return null;
}

/** member.id (= assigneeId) → имя из voters.json (или hint API). Включает disabled ПК. */
export function buildVoterNameByMemberId(
  teamMemberItems: unknown[],
  registry: VotersRegistry,
): Map<number, string> {
  const map = new Map<number, string>();

  for (const [name, record] of registry) {
    if (record.memberId) {
      map.set(record.memberId, name);
    }
  }

  for (const member of normalizeMemberList(teamMemberItems)) {
    if (!member.id) {
      continue;
    }

    const apiName = getMemberDisplayName(member);
    if (!apiName) {
      continue;
    }

    if (!map.has(member.id)) {
      map.set(member.id, apiName);
    }
  }

  return map;
}
