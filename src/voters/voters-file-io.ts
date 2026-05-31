import { readFile, writeFile } from "node:fs/promises";

import { VOTERS_FILE } from "../config/paths.js";
import type { VotersFile } from "./types.js";

export async function readVotersFile(
  filePath: string = VOTERS_FILE,
): Promise<VotersFile | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as VotersFile;

    if (!parsed.voters || typeof parsed.voters !== "object" || Array.isArray(parsed.voters)) {
      throw new Error(
        'voters.json: expected { "voters": { "Имя из jEvent": "username" | { "username", "telegramUserId" } } }',
      );
    }

    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeVotersFile(
  file: VotersFile,
  filePath: string = VOTERS_FILE,
): Promise<void> {
  const content = `${JSON.stringify(file, null, 2)}\n`;
  await writeFile(filePath, content, "utf-8");
}
