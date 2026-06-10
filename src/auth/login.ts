import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import { DEFAULT_EVENT_ID } from "../config/constants.js";
import { JUGRU_EVENT_BASE_URL, JEVENT_URLS } from "../config/urls.js";
import { BETA_ACCESS_TOKEN_COOKIE, saveBetaToken } from "./beta-token.js";
import { attachBetaAuthRoute } from "./browser-context.js";
import { saveSession } from "./session.js";
import { isSessionValid } from "./verify-session-api.js";

export type LoginCredentials = {
  username: string;
  password: string;
};

export type LoginResult = {
  context: BrowserContext;
  page: Page;
  browser: Browser;
};

export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginError";
  }
}

async function loginOnMyJugruPage(
  page: Page,
  credentials: LoginCredentials,
): Promise<void> {
  await page.goto(JEVENT_URLS.login, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  await page
    .locator('input[type="email"], input[type="text"]')
    .first()
    .fill(credentials.username);
  await page.locator('input[type="password"]').first().fill(credentials.password);
  await page
    .locator(
      'button[type="submit"], button:has-text("Войти"), button:has-text("Sign")',
    )
    .first()
    .click();

  await page.waitForURL(
    (url) => !url.pathname.includes("/auth/login-password"),
    { timeout: 60_000 },
  );
}

async function waitForBetaAccessToken(
  context: BrowserContext,
  attempts = 60,
): Promise<string | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const cookies = await context.cookies(JUGRU_EVENT_BASE_URL);
    const accessToken = cookies.find(
      (cookie) => cookie.name === BETA_ACCESS_TOKEN_COOKIE,
    )?.value;
    if (accessToken) {
      return accessToken;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  return null;
}

async function clickVotingPanelLoginButton(page: Page): Promise<void> {
  const loginButton = page
    .getByRole("button", { name: "Войти", exact: true })
    .or(page.locator("button").filter({ hasText: /^Войти$/i }))
    .or(page.getByText("Войти", { exact: true }));

  await loginButton.first().waitFor({ state: "visible", timeout: 30_000 });
  await loginButton.first().click();

  await page
    .waitForURL((url) => url.hostname.includes("beta.jugru.org"), {
      timeout: 90_000,
    })
    .catch(() => {});

  await page.waitForLoadState("networkidle", { timeout: 90_000 }).catch(() => {});
}

async function connectBetaSession(
  page: Page,
  context: BrowserContext,
): Promise<string> {
  await page.goto(JEVENT_URLS.polling(DEFAULT_EVENT_ID), {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  let accessToken = await waitForBetaAccessToken(context, 3);
  if (!accessToken) {
    await clickVotingPanelLoginButton(page);
    accessToken = await waitForBetaAccessToken(context);
  }

  if (!accessToken) {
    throw new LoginError(
      "Logged in on my.jugru.org, but beta session cookies were not set after clicking «Войти» on voting-panel.",
    );
  }

  await saveBetaToken(accessToken);
  return accessToken;
}

export async function loginWithPlaywright(
  credentials: LoginCredentials,
  options?: { headless?: boolean },
): Promise<LoginResult> {
  const headless = options?.headless ?? true;

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginOnMyJugruPage(page, credentials);
    const accessToken = await connectBetaSession(page, context);
    await attachBetaAuthRoute(context, accessToken);

    if (!(await isSessionValid(context.request))) {
      throw new LoginError(
        "Login succeeded but session is not valid for beta.jugru.org API requests.",
      );
    }

    await saveSession(context);
    return { browser, context, page };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

export async function createAuthenticatedContext(
  options?: { headless?: boolean },
): Promise<LoginResult | null> {
  const { sessionExists } = await import("./session.js");
  const { createAuthBrowserContext } = await import("./browser-context.js");
  const headless = options?.headless ?? true;

  if (!(await sessionExists())) {
    return null;
  }

  const browser = await chromium.launch({ headless });
  const context = await createAuthBrowserContext(browser);
  const page = await context.newPage();

  if (!(await isSessionValid(context.request))) {
    await browser.close();
    return null;
  }

  return { browser, context, page };
}

export async function verifySession(page: Page): Promise<boolean> {
  const context = page.context();
  return isSessionValid(context.request);
}
