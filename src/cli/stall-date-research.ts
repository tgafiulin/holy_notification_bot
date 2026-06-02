import "dotenv/config";

import { createAuthenticatedClient } from "../auth/authenticated-client.js";
import {
  DEFAULT_EVENT_ID,
  ELIGIBLE_INTERNAL_STATUS_NAME,
} from "../config/constants.js";
import type { Speech, SpeechVote } from "../models/jevent.js";
import {
  fetchInternalStatuses,
  findInternalStatusIdByName,
  flattenInternalStatuses,
} from "../scraper/fetch-internal-statuses.js";
import { fetchPollingData } from "../scraper/fetch-polling.js";
import {
  isEligibleSpeech,
  isPendingForVoter,
} from "../scraper/parse-votes.js";
import { isVoteComplete } from "../scraper/is-vote-complete.js";

/** jEvent сериализует LocalDateTime как [y, m, d, h, min, s, nano?] */
function formatJeventDateArray(value: number[] | null): string | null {
  if (value == null || value.length < 3) {
    return null;
  }
  const [y, m, d, h = 0, min = 0, s = 0] = value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)} ${pad(h)}:${pad(min)}:${pad(s)}`;
}

function daysSince(isoDate: string, now = new Date()): number {
  const then = new Date(isoDate.replace(" ", "T"));
  return Math.floor((now.getTime() - then.getTime()) / (24 * 60 * 60 * 1000));
}

function parseJeventDateArray(value: number[] | null): Date | null {
  const formatted = formatJeventDateArray(value);
  if (formatted == null) return null;
  return new Date(formatted.replace(" ", "T"));
}

type SpeechWithDates = Speech & {
  lastStatusUpdate?: number[] | null;
  pcDueDate?: number[] | null;
};

function collectExtraKeys(sample: object, known: Set<string>): string[] {
  return Object.keys(sample).filter((k) => !known.has(k));
}

type PendingRow = {
  speechId: number;
  speechTitle: string;
  voterName: string;
  speechVote: SpeechVote | null;
  speechExtraKeys: string[];
};

function inspectSpeech(speech: Speech): string[] {
  const known = new Set([
    "id",
    "name",
    "jiraKey",
    "jiraStatus",
    "jiraLink",
    "internalStatusId",
    "tempSpeakerName",
    "speakers",
    "voteTOList",
  ]);
  return collectExtraKeys(speech as object, known);
}

function inspectSpeechVote(sv: SpeechVote): string[] {
  const known = new Set([
    "id",
    "comment",
    "rating",
    "commentDate",
    "needToReview",
    "voteType",
  ]);
  return collectExtraKeys(sv as object, known);
}

async function main(): Promise<void> {
  const eventId = DEFAULT_EVENT_ID;
  const client = await createAuthenticatedClient();

  try {
    const [internalStatuses, pollingData] = await Promise.all([
      fetchInternalStatuses(client.request, eventId),
      fetchPollingData(client.request, { eventId }),
    ]);

    const eligibleStatusId = findInternalStatusIdByName(
      internalStatuses,
      ELIGIBLE_INTERNAL_STATUS_NAME,
    );
    if (eligibleStatusId == null) {
      throw new Error(`Status "${ELIGIBLE_INTERNAL_STATUS_NAME}" not found`);
    }

    const pendingRows: PendingRow[] = [];
    const speechExtraKeys = new Set<string>();
    const voteExtraKeys = new Set<string>();

    let pendingAssignments = 0;
    let pendingWithNullSpeechVote = 0;
    let pendingWithNullCommentDate = 0;
    let pendingWithCommentDate = 0;
    let pendingNeedToReviewTrue = 0;

    let completedOnEligible = 0;
    let completedWithCommentDate = 0;
    let completedWithNullCommentDate = 0;

    for (const speech of pollingData.speeches) {
      if (!isEligibleSpeech(speech, eligibleStatusId)) {
        continue;
      }

      for (const k of inspectSpeech(speech)) {
        speechExtraKeys.add(k);
      }

      for (const voter of speech.voteTOList) {
        if (voter.speechVote) {
          for (const k of inspectSpeechVote(voter.speechVote)) {
            voteExtraKeys.add(k);
          }
        }

        if (!voter.canVote) {
          continue;
        }

        const complete = isVoteComplete(voter.speechVote);
        if (complete) {
          completedOnEligible++;
          if (voter.speechVote?.commentDate != null) {
            completedWithCommentDate++;
          } else {
            completedWithNullCommentDate++;
          }
          continue;
        }

        pendingAssignments++;
        if (voter.speechVote == null) {
          pendingWithNullSpeechVote++;
        } else if (voter.speechVote.commentDate == null) {
          pendingWithNullCommentDate++;
        } else {
          pendingWithCommentDate++;
        }
        if (voter.speechVote?.needToReview) {
          pendingNeedToReviewTrue++;
        }

        if (isPendingForVoter(voter)) {
          pendingRows.push({
            speechId: speech.id,
            speechTitle: speech.name,
            voterName: voter.name,
            speechVote: voter.speechVote,
            speechExtraKeys: inspectSpeech(speech),
          });
        }
      }
    }

    console.log(`Event ${eventId}, status «${ELIGIBLE_INTERNAL_STATUS_NAME}» (id=${eligibleStatusId})\n`);

    console.log("=== Сводка по полям ===");
    console.log(`Pending assignments (canVote, !complete): ${pendingAssignments}`);
    console.log(`  speechVote === null: ${pendingWithNullSpeechVote}`);
    console.log(`  commentDate === null: ${pendingWithNullCommentDate}`);
    console.log(`  commentDate set: ${pendingWithCommentDate}`);
    console.log(`  needToReview === true: ${pendingNeedToReviewTrue}`);
    console.log();
    console.log(`Completed on eligible (canVote, complete): ${completedOnEligible}`);
    console.log(`  commentDate set: ${completedWithCommentDate}`);
    console.log(`  commentDate null: ${completedWithNullCommentDate}`);
    console.log();

    if (speechExtraKeys.size > 0) {
      console.log(`Extra keys on Speech (not in our types): ${[...speechExtraKeys].join(", ")}`);
    } else {
      console.log("Extra keys on Speech: none");
    }
    if (voteExtraKeys.size > 0) {
      console.log(`Extra keys on SpeechVote: ${[...voteExtraKeys].join(", ")}`);
    } else {
      console.log("Extra keys on SpeechVote: none");
    }
    console.log();

    if (pendingRows.length === 0) {
      console.log("No pending rows to list.");
      return;
    }

    console.log("=== Pending: speechVote details (sorted by commentDate asc, nulls last) ===\n");

    const sorted = [...pendingRows].sort((a, b) => {
      const da = a.speechVote?.commentDate;
      const db = b.speechVote?.commentDate;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      for (let i = 0; i < Math.min(da.length, db.length); i++) {
        if (da[i] !== db[i]) return da[i] - db[i];
      }
      return 0;
    });

    const now = new Date();
    for (const row of sorted) {
      const sv = row.speechVote;
      const formatted = formatJeventDateArray(sv?.commentDate ?? null);
      const age =
        formatted != null ? `${daysSince(formatted, now)}d ago` : "—";
      const commentPreview =
        sv?.comment.trim() ? `"${sv.comment.trim().slice(0, 40)}…"` : "(empty)";
      const voteType = sv?.voteType?.name ?? "null";
      const rating = sv?.rating ?? "null";

      console.log(
        `[${row.speechId}] ${row.speechTitle.slice(0, 60)}${row.speechTitle.length > 60 ? "…" : ""}`,
      );
      console.log(`  voter: ${row.voterName}`);
      console.log(
        `  commentDate: ${formatted ?? "null"} (${age}) | needToReview: ${sv?.needToReview ?? "n/a"} | voteType: ${voteType} | rating: ${rating} | comment: ${commentPreview}`,
      );
      if (row.speechExtraKeys.length > 0) {
        console.log(`  speech extra keys: ${row.speechExtraKeys.join(", ")}`);
      }
      console.log();
    }

    // Speech-level dates for pending (dedupe by speechId)
    console.log("=== Speech-level dates (unique pending speeches) ===\n");
    const seenSpeech = new Set<number>();
    for (const speech of pollingData.speeches) {
      if (!isEligibleSpeech(speech, eligibleStatusId)) continue;
      const hasPending = speech.voteTOList.some((v) => isPendingForVoter(v));
      if (!hasPending || seenSpeech.has(speech.id)) continue;
      seenSpeech.add(speech.id);

      const raw = speech as Speech & {
        lastStatusUpdate?: number[] | null;
        pcDueDate?: number[] | null;
      };
      const lastStatus = formatJeventDateArray(raw.lastStatusUpdate ?? null);
      const pcDue = formatJeventDateArray(raw.pcDueDate ?? null);

      const pendingDates = speech.voteTOList
        .filter((v) => isPendingForVoter(v))
        .map((v) => ({
          voter: v.name,
          commentDate: formatJeventDateArray(v.speechVote?.commentDate ?? null),
        }));

      console.log(`[${speech.id}] ${speech.name.slice(0, 55)}`);
      console.log(`  lastStatusUpdate: ${lastStatus ?? "null"}`);
      console.log(`  pcDueDate: ${pcDue ?? "null"}`);
      console.log(`  pending voters commentDate:`);
      for (const p of pendingDates) {
        console.log(`    ${p.voter}: ${p.commentDate ?? "null"}`);
      }
      console.log();
    }

    const threshold = Number(process.env.STALL_THRESHOLD_DAYS ?? "14");
    if (threshold > 0) {
      const stalledByComment = pendingRows.filter((row) => {
        const f = formatJeventDateArray(row.speechVote?.commentDate ?? null);
        return f != null && daysSince(f) >= threshold;
      });
      console.log(
        `=== Stall preview by commentDate (>= ${threshold}d): ${stalledByComment.length}/${pendingRows.length} assignments ===\n`,
      );

      const speechById = new Map(
        pollingData.speeches.map((s) => [s.id, s as SpeechWithDates]),
      );
      const stalledByLastStatus = pendingRows.filter((row) => {
        const speech = speechById.get(row.speechId);
        const ls = formatJeventDateArray(speech?.lastStatusUpdate ?? null);
        return ls != null && daysSince(ls) >= threshold;
      });
      console.log(
        `=== Stall preview by lastStatusUpdate (>= ${threshold}d): ${stalledByLastStatus.length}/${pendingRows.length} assignments ===\n`,
      );
    }

    // --- lastStatusUpdate hypothesis ---
    const statusNameById = new Map(
      flattenInternalStatuses(internalStatuses).map((s) => [s.id, s.name]),
    );

    console.log("=== lastStatusUpdate vs internalStatusId (all speeches with date) ===\n");
    const byStatus = new Map<
      string,
      { count: number; samples: string[] }
    >();

    for (const speech of pollingData.speeches) {
      const raw = speech as SpeechWithDates;
      const ls = formatJeventDateArray(raw.lastStatusUpdate ?? null);
      if (ls == null) continue;

      const statusName =
        statusNameById.get(speech.internalStatusId) ??
        `id=${speech.internalStatusId}`;
      const entry = byStatus.get(statusName) ?? { count: 0, samples: [] };
      entry.count++;
      if (entry.samples.length < 2) {
        entry.samples.push(`[${speech.id}] ${ls}`);
      }
      byStatus.set(statusName, entry);
    }

    for (const [name, { count, samples }] of [...byStatus.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    )) {
      console.log(`«${name}»: ${count} speeches, e.g. ${samples.join("; ")}`);
    }
    console.log();

    console.log(
      `=== «${ELIGIBLE_INTERNAL_STATUS_NAME}»: commentDate vs lastStatusUpdate (pending) ===\n`,
    );
    let pendingBeforeStatus = 0;
    let pendingOnOrAfterStatus = 0;
    let pendingSameDayAsStatus = 0;

    for (const speech of pollingData.speeches) {
      if (!isEligibleSpeech(speech, eligibleStatusId)) continue;
      const raw = speech as SpeechWithDates;
      const statusAt = parseJeventDateArray(raw.lastStatusUpdate ?? null);
      if (statusAt == null) continue;

      for (const voter of speech.voteTOList) {
        if (!isPendingForVoter(voter)) continue;
        const cd = parseJeventDateArray(voter.speechVote?.commentDate ?? null);
        if (cd == null) continue;

        const cdStr = formatJeventDateArray(voter.speechVote?.commentDate ?? null)!;
        const lsStr = formatJeventDateArray(raw.lastStatusUpdate ?? null)!;
        const diffDays = Math.floor(
          (statusAt.getTime() - cd.getTime()) / (24 * 60 * 60 * 1000),
        );

        if (cd < statusAt) {
          pendingBeforeStatus++;
          console.log(
            `  commentDate РАНЬШЕ lastStatusUpdate на ${diffDays}d: [${speech.id}] ${voter.name}`,
          );
          console.log(`    commentDate: ${cdStr} | lastStatusUpdate: ${lsStr}`);
        } else if (
          cd.toDateString() === statusAt.toDateString()
        ) {
          pendingSameDayAsStatus++;
        } else {
          pendingOnOrAfterStatus++;
          console.log(
            `  commentDate ПОЗЖЕ lastStatusUpdate на ${-diffDays}d: [${speech.id}] ${voter.name}`,
          );
          console.log(`    commentDate: ${cdStr} | lastStatusUpdate: ${lsStr}`);
        }
      }
    }

    console.log();
    console.log("Итого pending:");
    console.log(`  commentDate < lastStatusUpdate: ${pendingBeforeStatus}`);
    console.log(`  same calendar day: ${pendingSameDayAsStatus}`);
    console.log(`  commentDate > lastStatusUpdate: ${pendingOnOrAfterStatus}`);
    console.log();

    // Sample one completed vote with commentDate for comparison
    console.log("=== Sample completed votes with commentDate (up to 3) ===\n");
    let shown = 0;
    for (const speech of pollingData.speeches) {
      if (!isEligibleSpeech(speech, eligibleStatusId) || shown >= 3) break;
      for (const voter of speech.voteTOList) {
        if (!voter.canVote || !isVoteComplete(voter.speechVote)) continue;
        if (voter.speechVote?.commentDate == null) continue;
        const formatted = formatJeventDateArray(voter.speechVote.commentDate);
        console.log(
          `[${speech.id}] ${speech.name.slice(0, 50)} | ${voter.name} | commentDate: ${formatted} | voteType: ${voter.speechVote.voteType?.name ?? "null"}`,
        );
        shown++;
        if (shown >= 3) break;
      }
    }
  } finally {
    await client.dispose();
  }
}

main().catch((error: unknown) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
