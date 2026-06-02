import type { APIRequestContext } from "playwright";

import {
  DEFAULT_EVENT_ID,
  ELIGIBLE_INTERNAL_STATUS_NAME,
} from "../config/constants.js";
import type { VoterPendingSummary } from "../models/jevent.js";
import {
  fetchInternalStatuses,
  findInternalStatusIdByName,
} from "../scraper/fetch-internal-statuses.js";
import { fetchPcMembers } from "../scraper/fetch-pcmembers.js";
import { fetchPollingData } from "../scraper/fetch-polling.js";
import { parsePollingResponse } from "../scraper/parse-votes.js";
import { syncVotersFromPcMembers } from "../voters/sync-voters-from-pcmembers.js";

export type PendingSummary = {
  eventId: string;
  eligibleStatusName: string;
  eligibleStatusId: number;
  totalSpeechCount: number;
  eligibleSpeechCount: number;
  pendingCount: number;
  byVoter: VoterPendingSummary[];
  votersAdded: string[];
};

export async function fetchPendingSummary(
  request: APIRequestContext,
  eventId: string = DEFAULT_EVENT_ID,
): Promise<PendingSummary> {
  const [internalStatuses, pollingData, pcMembers] = await Promise.all([
    fetchInternalStatuses(request, eventId),
    fetchPollingData(request, { eventId }),
    fetchPcMembers(request, eventId),
  ]);

  const { added: votersAdded } = await syncVotersFromPcMembers(pcMembers);

  const eligibleStatusId = findInternalStatusIdByName(
    internalStatuses,
    ELIGIBLE_INTERNAL_STATUS_NAME,
  );

  if (eligibleStatusId == null) {
    throw new Error(
      `Internal status "${ELIGIBLE_INTERNAL_STATUS_NAME}" not found for event ${eventId}`,
    );
  }

  const { byVoter, pending, eligibleSpeechCount } = parsePollingResponse(
    pollingData,
    eligibleStatusId,
  );

  return {
    eventId,
    eligibleStatusName: ELIGIBLE_INTERNAL_STATUS_NAME,
    eligibleStatusId,
    totalSpeechCount: pollingData.speeches.length,
    eligibleSpeechCount,
    pendingCount: pending.length,
    byVoter,
    votersAdded,
  };
}
