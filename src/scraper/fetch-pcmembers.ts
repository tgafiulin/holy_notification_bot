import type { APIRequestContext } from "playwright";

import { JEVENT_URLS } from "../config/urls.js";
import type { CommitteeMember } from "../models/program.js";
import { mapMemberListToCommitteeMembers } from "./committee-members.js";

export async function fetchTeamMemberList(
  request: APIRequestContext,
  url: string,
  label: string,
): Promise<unknown[]> {
  const response = await request.get(url, {
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(
      `${label} request failed: HTTP ${response.status()} ${text.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as { data?: unknown[] };
  return data.data ?? [];
}

export type CommitteeMembersData = {
  committeeMembers: CommitteeMember[];
  teamMemberItems: unknown[];
};

export async function fetchCommitteeMembersData(
  request: APIRequestContext,
  eventId: string | number,
): Promise<CommitteeMembersData> {
  const candidates = await fetchTeamMemberList(
    request,
    JEVENT_URLS.assignmentCandidates(eventId),
    "PC candidates",
  );

  const committeeFromCandidates = mapMemberListToCommitteeMembers(candidates);
  if (committeeFromCandidates.length > 0) {
    return {
      committeeMembers: committeeFromCandidates,
      teamMemberItems: candidates,
    };
  }

  const teamMemberItems = await fetchTeamMemberList(
    request,
    JEVENT_URLS.pcMembers(eventId),
    "Team members",
  );

  return {
    committeeMembers: mapMemberListToCommitteeMembers(teamMemberItems),
    teamMemberItems,
  };
}
