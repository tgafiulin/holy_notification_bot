import "dotenv/config";

import { createAuthenticatedClient } from "../auth/authenticated-client.js";
import {
  DEFAULT_EVENT_ID,
  ELIGIBLE_INTERNAL_STATUS_NAME,
} from "../config/constants.js";
import {
  fetchInternalStatuses,
  findInternalStatusIdByName,
} from "../scraper/fetch-internal-statuses.js";
import { fetchPollingData } from "../scraper/fetch-polling.js";
import { parsePollingResponse } from "../scraper/parse-votes.js";

async function main(): Promise<void> {
  const eventId = process.env.JEVENT_EVENT_ID ?? DEFAULT_EVENT_ID;
  const client = await createAuthenticatedClient();

  try {
    console.log(`Fetching data for event ${eventId}...\n`);

    const [internalStatuses, pollingData] = await Promise.all([
      fetchInternalStatuses(client.request, eventId),
      fetchPollingData(client.request, { eventId }),
    ]);

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

    console.log(`Total speeches in response: ${pollingData.speeches.length}`);
    console.log(
      `Eligible internal status "${ELIGIBLE_INTERNAL_STATUS_NAME}" (id=${eligibleStatusId}): ${eligibleSpeechCount}`,
    );
    console.log(`Pending vote assignments: ${pending.length}\n`);

    if (byVoter.length === 0) {
      console.log("No pending votes for eligible speeches.");
      return;
    }

    for (const voter of byVoter) {
      console.log(`${voter.voterName} (${voter.pending.length}):`);
      for (const item of voter.pending) {
        console.log(`  - ${item.authorNames} — ${item.speechTitle}`);
      }
      console.log();
    }
  } finally {
    await client.dispose();
  }
}

main().catch((error: unknown) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
