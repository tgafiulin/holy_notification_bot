import type { Browser, BrowserContext } from "playwright";

import { JUGRU_EVENT_BASE_URL } from "../config/urls.js";
import { loadBetaToken } from "./beta-token.js";
import { getSessionPath } from "./session.js";

export async function attachBetaAuthRoute(
  context: BrowserContext,
  accessToken: string,
): Promise<void> {
  await context.route(`${JUGRU_EVENT_BASE_URL}/**`, async (route) => {
    const headers = {
      ...route.request().headers(),
      authorization: `Bearer ${accessToken}`,
    };
    await route.continue({ headers });
  });
}

export async function createAuthBrowserContext(
  browser: Browser,
  options?: { storageState?: string; accessToken?: string | null },
): Promise<BrowserContext> {
  const context = await browser.newContext({
    storageState: options?.storageState ?? getSessionPath(),
  });

  const accessToken = options?.accessToken ?? (await loadBetaToken());
  if (accessToken) {
    await attachBetaAuthRoute(context, accessToken);
  }

  return context;
}
