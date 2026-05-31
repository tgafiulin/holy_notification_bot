import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import { JEVENT_URLS } from "../config/urls.js";
import { saveSession } from "./session.js";

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

export async function loginWithPlaywright(
  credentials: LoginCredentials,
  options?: { headless?: boolean },
): Promise<LoginResult> {
  const headless = options?.headless ?? true;

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(JEVENT_URLS.login, { waitUntil: "domcontentloaded" });

  await page.fill('input[name="username"]', credentials.username);
  await page.fill('input[name="password"]', credentials.password);
  await page.click('button[type="submit"]');

  await page.waitForLoadState("networkidle");

  if (page.url().includes("/login")) {
    await browser.close();
    throw new LoginError(
      "Login failed: still on login page. Check username and password.",
    );
  }

  await saveSession(context);

  return { browser, context, page };
}

export async function createAuthenticatedContext(
  options?: { headless?: boolean },
): Promise<LoginResult | null> {
  const { sessionExists, getSessionPath } = await import("./session.js");
  const headless = options?.headless ?? true;

  if (!(await sessionExists())) {
    return null;
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ storageState: getSessionPath() });
  const page = await context.newPage();

  await page.goto(JEVENT_URLS.login, { waitUntil: "domcontentloaded" });

  if (page.url().includes("/login")) {
    await browser.close();
    return null;
  }

  return { browser, context, page };
}

export async function verifySession(page: Page): Promise<boolean> {
  await page.goto(JEVENT_URLS.login, { waitUntil: "domcontentloaded" });
  return !page.url().includes("/login");
}
