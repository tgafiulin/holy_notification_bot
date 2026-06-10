import { chromium } from "playwright";

import { createAuthBrowserContext } from "./browser-context.js";
import {
  LoginError,
  loginWithPlaywright,
  type LoginCredentials,
} from "./login.js";
import { sessionExists } from "./session.js";
import { isSessionValid } from "./verify-session-api.js";

export type EnsureSessionResult =
  | { status: "ready" }
  | { status: "needs_credentials" }
  | { status: "failed"; message: string };

export function getCredentialsFromEnv(): LoginCredentials | null {
  const username = process.env.JEVENT_USERNAME?.trim();
  const password = process.env.JEVENT_PASSWORD?.trim();

  if (username && password) {
    return { username, password };
  }

  return null;
}

async function isStoredSessionValid(
  options?: { headless?: boolean },
): Promise<boolean> {
  if (!(await sessionExists())) {
    return false;
  }

  const headless = options?.headless ?? true;
  const browser = await chromium.launch({ headless });

  try {
    const context = await createAuthBrowserContext(browser);
    return await isSessionValid(context.request);
  } finally {
    await browser.close();
  }
}

export async function ensureJeventSession(
  credentials?: LoginCredentials,
  options?: { headless?: boolean },
): Promise<EnsureSessionResult> {
  const headless = options?.headless ?? true;

  if (await isStoredSessionValid({ headless })) {
    return { status: "ready" };
  }

  if (!credentials?.username || !credentials.password) {
    return { status: "needs_credentials" };
  }

  try {
    const result = await loginWithPlaywright(credentials, { headless });
    await result.browser.close();

    if (await isStoredSessionValid({ headless })) {
      return { status: "ready" };
    }

    return {
      status: "failed",
      message: "Login succeeded but session is not valid for API requests.",
    };
  } catch (error) {
    const message =
      error instanceof LoginError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Login failed";
    return { status: "failed", message };
  }
}
