import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { DATA_DIR } from "../config/paths.js";

const BETA_TOKEN_FILE = path.join(DATA_DIR, "beta-token.json");

export const BETA_ACCESS_TOKEN_COOKIE = "online.session.access_token";

type BetaTokenFile = {
  accessToken: string;
};

export async function saveBetaToken(accessToken: string): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const payload: BetaTokenFile = { accessToken };
  await writeFile(BETA_TOKEN_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

export async function loadBetaToken(): Promise<string | null> {
  try {
    const raw = await readFile(BETA_TOKEN_FILE, "utf-8");
    const data = JSON.parse(raw) as BetaTokenFile & { token?: string };
    return data.accessToken?.trim() || data.token?.trim() || null;
  } catch {
    return null;
  }
}
