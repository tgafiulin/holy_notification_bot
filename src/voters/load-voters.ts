import { readFile } from "node:fs/promises";

import { VOTERS_FILE } from "../config/paths.js";
import { isMappedTelegramUsername } from "./is-mapped-telegram-username.js";
import { normalizeTelegramUsername } from "./normalize-telegram-username.js";
import type { VotersFile, VotersMap } from "./types.js";

function parseVotersFile(content: string): VotersMap {
  const parsed = JSON.parse(content) as VotersFile;

  if (!parsed.voters || typeof parsed.voters !== "object" || Array.isArray(parsed.voters)) {
    throw new Error(
      'voters.json: expected { "voters": { "Имя из jEvent": "telegram_username" } }',
    );
  }

  const map: VotersMap = new Map();

  for (const [jeventName, rawUsername] of Object.entries(parsed.voters)) {
    const name = jeventName.trim();
    const username = normalizeTelegramUsername(String(rawUsername));

    if (!name || !isMappedTelegramUsername(username)) {
      continue;
    }

    if (map.has(name)) {
      throw new Error(`voters.json: duplicate jEvent name "${name}"`);
    }

    map.set(name, username);
  }

  return map;
}

export async function loadVotersMap(
  filePath: string = VOTERS_FILE,
): Promise<VotersMap> {
  try {
    const content = await readFile(filePath, "utf-8");
    return parseVotersFile(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Map();
    }

    throw error;
  }
}
