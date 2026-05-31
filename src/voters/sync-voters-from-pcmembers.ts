import type { PcMember } from "../models/jevent.js";
import type { VotersFile } from "./types.js";
import { readVotersFile, writeVotersFile } from "./voters-file-io.js";

export type SyncVotersResult = {
  added: string[];
};

function isActivePcMember(member: PcMember): boolean {
  return member.enabled && member.canVote;
}

export async function syncVotersFromPcMembers(
  members: PcMember[],
): Promise<SyncVotersResult> {
  const file = (await readVotersFile()) ?? ({ version: 2, voters: {} } satisfies VotersFile);
  const added: string[] = [];

  for (const member of members) {
    if (!isActivePcMember(member)) {
      continue;
    }

    const name = member.name.trim();
    if (!name || name in file.voters) {
      continue;
    }

    file.voters[name] = {
      username: "",
      telegramUserId: null,
    };
    added.push(name);
  }

  if (added.length > 0) {
    file.version = Math.max(file.version ?? 1, 2);
    await writeVotersFile(file);
  }

  return { added: added.sort((a, b) => a.localeCompare(b, "ru")) };
}
