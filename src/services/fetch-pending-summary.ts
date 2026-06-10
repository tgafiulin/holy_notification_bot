import type { APIRequestContext } from "playwright";

import { DEFAULT_EVENT_ID, STATUS_LABEL_VOTING } from "../config/constants.js";
import type { VoterPendingSummary } from "../models/program.js";
import { summarizePending } from "../scraper/collect-pending.js";
import { buildVoterNameByMemberId } from "../scraper/committee-members.js";
import { fetchCommitteeMembersData } from "../scraper/fetch-pcmembers.js";
import { fetchProposals } from "../scraper/fetch-polling.js";
import { loadVotersRegistry } from "../voters/load-voters.js";

export type PendingSummary = {
  eventId: string;
  eligibleStatusName: string;
  totalProposalCount: number;
  eligibleProposalCount: number;
  pendingCount: number;
  byVoter: VoterPendingSummary[];
};

export async function fetchPendingSummary(
  request: APIRequestContext,
  eventId: string = DEFAULT_EVENT_ID,
): Promise<PendingSummary> {
  const [{ teamMemberItems }, registry] = await Promise.all([
    fetchCommitteeMembersData(request, eventId),
    loadVotersRegistry(),
  ]);
  const voterNameByMemberId = buildVoterNameByMemberId(teamMemberItems, registry);

  const { proposals, totalProposals } = await fetchProposals(request, {
    eventId,
    voterNameByMemberId,
  });

  const { byVoter, pending, eligibleProposalCount } = summarizePending(proposals);

  return {
    eventId,
    eligibleStatusName: STATUS_LABEL_VOTING,
    totalProposalCount: totalProposals,
    eligibleProposalCount,
    pendingCount: pending.length,
    byVoter,
  };
}
