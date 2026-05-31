import "dotenv/config";

import { createAuthenticatedClient } from "../auth/authenticated-client.js";
import { fetchPendingSummary } from "../services/fetch-pending-summary.js";
import { formatVotersSyncNote } from "../voters/format-voters-sync-note.js";
import { loadVotersMap } from "../voters/load-voters.js";
import { telegramProfileUrl } from "../voters/normalize-telegram-username.js";

async function main(): Promise<void> {
  const client = await createAuthenticatedClient();

  try {
    console.log("Fetching data...\n");

    const summary = await fetchPendingSummary(client.request);
    const votersMap = await loadVotersMap();

    console.log(`Total speeches in response: ${summary.totalSpeechCount}`);
    console.log(
      `Eligible internal status "${summary.eligibleStatusName}" (id=${summary.eligibleStatusId}): ${summary.eligibleSpeechCount}`,
    );
    console.log(`Pending vote assignments: ${summary.pendingCount}`);

    const syncNote = formatVotersSyncNote(summary.votersAdded);
    if (syncNote) {
      console.log(`\n${syncNote}\n`);
    } else {
      console.log();
    }

    if (summary.byVoter.length === 0) {
      console.log("No pending votes for eligible speeches.");
      return;
    }

    for (const voter of summary.byVoter) {
      const username = votersMap.get(voter.voterName);
      const tgSuffix = username
        ? ` — ${telegramProfileUrl(username)}`
        : "";
      console.log(`${voter.voterName}${tgSuffix} (${voter.pending.length}):`);
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
