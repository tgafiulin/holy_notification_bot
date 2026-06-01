import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { DATA_DIR, REMINDER_STATE_FILE } from "../config/paths.js";
import type { ReminderState } from "./types.js";

function emptyState(eventId: string): ReminderState {
  return {
    eventId,
    processedSlots: [],
    missedNotifiedSlots: [],
    voters: {},
  };
}

function isReminderState(value: unknown): value is ReminderState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.eventId === "string" &&
    Array.isArray(record.processedSlots) &&
    Array.isArray(record.missedNotifiedSlots) &&
    !!record.voters &&
    typeof record.voters === "object"
  );
}

export async function loadReminderState(eventId: string): Promise<ReminderState> {
  try {
    const raw = await readFile(REMINDER_STATE_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (!isReminderState(parsed)) {
      return emptyState(eventId);
    }

    if (parsed.eventId !== eventId) {
      return emptyState(eventId);
    }

    return parsed;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT"
    ) {
      return emptyState(eventId);
    }

    throw error;
  }
}

export async function saveReminderState(state: ReminderState): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tempPath = path.join(DATA_DIR, ".reminder-state.json.tmp");
  await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await writeFile(REMINDER_STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
