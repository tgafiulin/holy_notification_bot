import type { APIRequestContext } from "playwright";

import type { PaginatedResponse, ProposalDto } from "../api/proposals.js";
import { JEVENT_URLS } from "../config/urls.js";
import type { Proposal } from "../models/program.js";
import { fetchCommitteeMembersData } from "./fetch-pcmembers.js";
import { mapProposals } from "./map-proposals.js";

export type FetchProposalsOptions = {
  eventId: string | number;
  voterNameByMemberId?: Map<number, string>;
};

export type FetchProposalsResult = {
  proposals: Proposal[];
  totalProposals: number;
};

export async function fetchProposals(
  request: APIRequestContext,
  options: FetchProposalsOptions,
): Promise<FetchProposalsResult> {
  const url = JEVENT_URLS.proposals(options.eventId);

  const [response, membersData] = await Promise.all([
    request.get(url, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    }),
    options.voterNameByMemberId
      ? null
      : fetchCommitteeMembersData(request, options.eventId),
  ]);

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(
      `Proposals request failed: HTTP ${response.status()} ${text.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as PaginatedResponse<ProposalDto>;
  const voterNameByMemberId =
    options.voterNameByMemberId ??
    new Map(
      (membersData?.committeeMembers ?? []).map((member) => [member.id, member.name]),
    );

  const proposals = mapProposals(data, voterNameByMemberId);

  return {
    proposals,
    totalProposals: data.data.length,
  };
}
