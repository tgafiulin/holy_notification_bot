import { VOTERS_FILE } from "../config/paths.js";
import { parseVoterEntry } from "./parse-voter-entry.js";
import type { VotersFile, VotersMap, VotersRegistry } from "./types.js";
import { readVotersFile } from "./voters-file-io.js";

function parseVotersFile(parsed: VotersFile): VotersRegistry {
  const registry: VotersRegistry = new Map();

  for (const [jeventName, rawEntry] of Object.entries(parsed.voters)) {
    const name = jeventName.trim();
    if (!name) {
      continue;
    }

    if (registry.has(name)) {
      throw new Error(`voters.json: duplicate jEvent name "${name}"`);
    }

    registry.set(name, parseVoterEntry(rawEntry));
  }

  return registry;
}

async function readVotersRegistry(
  filePath: string = VOTERS_FILE,
): Promise<VotersRegistry> {
  const file = await readVotersFile(filePath);
  if (!file) {
    return new Map();
  }

  return parseVotersFile(file);
}

export async function loadVotersRegistry(
  filePath: string = VOTERS_FILE,
): Promise<VotersRegistry> {
  return readVotersRegistry(filePath);
}

export function votersRegistryToUsernameMap(registry: VotersRegistry): VotersMap {
  const map: VotersMap = new Map();

  for (const [name, record] of registry) {
    if (record.username) {
      map.set(name, record.username);
    }
  }

  return map;
}

export async function loadVotersMap(
  filePath: string = VOTERS_FILE,
): Promise<VotersMap> {
  const registry = await readVotersRegistry(filePath);
  return votersRegistryToUsernameMap(registry);
}
