import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext } from "playwright";

import { DATA_DIR } from "../config/paths.js";
import { SESSION_FILE } from "../config/urls.js";

export async function saveSession(context: BrowserContext): Promise<void> {
  const dir = path.dirname(SESSION_FILE);
  await mkdir(dir, { recursive: true });
  await context.storageState({ path: SESSION_FILE });
}

export async function sessionExists(): Promise<boolean> {
  try {
    await readFile(SESSION_FILE, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function getSessionPath(): string {
  return SESSION_FILE;
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    rm(SESSION_FILE, { force: true }),
    rm(path.join(DATA_DIR, "beta-token.json"), { force: true }),
  ]);
}
