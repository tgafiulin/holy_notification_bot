import "dotenv/config";

import { createAuthenticatedClient } from "../auth/authenticated-client.js";
import {
  DEFAULT_EVENT_ID,
  DEFAULT_TIMEZONE,
  STATUS_LABEL_VOTING,
} from "../config/constants.js";
import { loadStallConfig } from "../config/stall-config.js";
import { collectPending } from "../scraper/collect-pending.js";
import { fetchProposals } from "../scraper/fetch-polling.js";
import { filterStalledPending } from "../stall/stall-filter.js";
import { calendarDaysBetweenInTimeZone } from "../reminder/timezone.js";

function formatIsoDate(iso: string | null): string | null {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function main(): Promise<void> {
  const eventId = DEFAULT_EVENT_ID;
  const client = await createAuthenticatedClient();
  const stallConfig = loadStallConfig();

  try {
    const { proposals, totalProposals } = await fetchProposals(client.request, {
      eventId,
    });
    const pending = collectPending(proposals);
    const now = new Date();
    const { stalled } = filterStalledPending(pending, stallConfig, {}, now);

    console.log(`Event ${eventId}, status «${STATUS_LABEL_VOTING}»\n`);
    console.log(`Total proposals in API: ${totalProposals}`);
    console.log(`Eligible proposals: ${proposals.length}`);
    console.log(`Pending assignments: ${pending.length}`);
    console.log(
      `Stalled (>= ${stallConfig.thresholdDays}d, ${stallConfig.timeZone}): ${stalled.length}\n`,
    );

    if (pending.length === 0) {
      console.log("No pending assignments.");
      return;
    }

    console.log("=== Pending assignments (sorted by pendingSince, nulls last) ===\n");

    const sorted = [...pending].sort((a, b) => {
      if (a.pendingSince == null && b.pendingSince == null) return 0;
      if (a.pendingSince == null) return 1;
      if (b.pendingSince == null) return -1;
      return a.pendingSince.localeCompare(b.pendingSince);
    });

    for (const item of sorted) {
      const formatted = formatIsoDate(item.pendingSince);
      const since = item.pendingSince ? new Date(item.pendingSince) : null;
      const days =
        since != null
          ? calendarDaysBetweenInTimeZone(since, now, DEFAULT_TIMEZONE)
          : null;
      const stalledMark = days != null && days >= stallConfig.thresholdDays ? "STALL" : "recent";

      console.log(
        `[${item.proposalId}] ${item.proposalTitle.slice(0, 60)}${item.proposalTitle.length > 60 ? "…" : ""}`,
      );
      console.log(`  voter: ${item.voterName}`);
      console.log(
        `  pendingSince: ${formatted ?? "null"} (${days ?? "?"}d, ${stalledMark})`,
      );
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
