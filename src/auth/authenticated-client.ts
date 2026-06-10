import { chromium, type APIRequestContext, type Browser } from "playwright";

import { createAuthBrowserContext } from "./browser-context.js";
import { sessionExists } from "./session.js";

export type AuthenticatedClient = {
  request: APIRequestContext;
  browser: Browser;
  dispose: () => Promise<void>;
};

export async function createAuthenticatedClient(options?: {
  headless?: boolean;
}): Promise<AuthenticatedClient> {
  if (!(await sessionExists())) {
    throw new Error(
      "No saved session. Run `npm run login` first.",
    );
  }

  const headless = options?.headless ?? true;
  const browser = await chromium.launch({ headless });
  const context = await createAuthBrowserContext(browser);
  const request = context.request;

  return {
    request,
    browser,
    dispose: async () => {
      await browser.close();
    },
  };
}
