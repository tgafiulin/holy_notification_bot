import "dotenv/config";

import { createAuthenticatedClient } from "../auth/authenticated-client.js";
import {
  DEFAULT_EVENT_ID,
  STATUS_LABEL_VOTING,
} from "../config/constants.js";
import type { Proposal } from "../models/program.js";
import { collectPending } from "../scraper/collect-pending.js";
import { fetchProposals } from "../scraper/fetch-polling.js";

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

function daysSince(iso: string, now = new Date()): number {
  const then = new Date(iso);
  return Math.floor((now.getTime() - then.getTime()) / (24 * 60 * 60 * 1000));
}

async function main(): Promise<void> {
  const eventId = DEFAULT_EVENT_ID;
  const client = await createAuthenticatedClient();

  try {
    const { proposals, totalProposals } = await fetchProposals(client.request, {
      eventId,
    });
    const pending = collectPending(proposals);

    console.log(`Event ${eventId}, status «${STATUS_LABEL_VOTING}»\n`);
    console.log(`Total proposals in API: ${totalProposals}`);
    console.log(`Eligible proposals: ${proposals.length}`);
    console.log(`Pending assignments: ${pending.length}\n`);

    if (pending.length === 0) {
      console.log("No pending assignments.");
      return;
    }

    console.log("=== Pending assignments (sorted by statusChangedAt, nulls last) ===\n");

    const sorted = [...pending].sort((a, b) => {
      if (a.statusChangedAt == null && b.statusChangedAt == null) return 0;
      if (a.statusChangedAt == null) return 1;
      if (b.statusChangedAt == null) return -1;
      return a.statusChangedAt.localeCompare(b.statusChangedAt);
    });

    const now = new Date();
    for (const item of sorted) {
      const formatted = formatIsoDate(item.statusChangedAt);
      const age =
        item.statusChangedAt != null
          ? `${daysSince(item.statusChangedAt, now)}d ago`
          : "—";

      console.log(
        `[${item.proposalId}] ${item.proposalTitle.slice(0, 60)}${item.proposalTitle.length > 60 ? "…" : ""}`,
      );
      console.log(`  voter: ${item.voterName}`);
      console.log(`  statusChangedAt: ${formatted ?? "null"} (${age})`);
      console.log();
    }

    const threshold = Number(process.env.STALL_THRESHOLD_DAYS ?? "14");
    if (threshold > 0) {
      const stalled = pending.filter((item) => {
        if (!item.statusChangedAt) {
          return false;
        }
        return daysSince(item.statusChangedAt) >= threshold;
      });
      console.log(
        `=== Stall preview by statusChangedAt (>= ${threshold}d): ${stalled.length}/${pending.length} assignments ===\n`,
      );
    }

    console.log("=== Sample completed assignments (up to 3) ===\n");
    let shown = 0;
    for (const proposal of proposals) {
      if (shown >= 3) {
        break;
      }

      for (const assignment of proposal.assignments) {
        if (!assignment.canVote || assignment.pending || !assignment.completedAt) {
          continue;
        }

        console.log(
          `[${proposal.id}] ${proposal.title.slice(0, 50)} | ${assignment.voterName} | completedAt: ${formatIsoDate(assignment.completedAt)}`,
        );
        shown++;
        if (shown >= 3) {
          break;
        }
      }
    }

    const withStatusDate = proposals.filter((p: Proposal) => p.statusChangedAt != null);
    console.log(`\nProposals with statusChangedAt: ${withStatusDate.length}/${proposals.length}`);
  } finally {
    await client.dispose();
  }
}

main().catch((error: unknown) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
