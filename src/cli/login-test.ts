import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import "dotenv/config";

import {
  ensureJeventSession,
  getCredentialsFromEnv,
} from "../auth/ensure-session.js";
import { createAuthenticatedContext, verifySession } from "../auth/login.js";
import { DEFAULT_EVENT_ID } from "../config/constants.js";
import { JEVENT_URLS } from "../config/urls.js";

async function promptCredentials(): Promise<{ username: string; password: string }> {
  const fromEnv = getCredentialsFromEnv();
  if (fromEnv) {
    console.log("Using credentials from environment variables.");
    return fromEnv;
  }

  const rl = createInterface({ input, output });

  try {
    const promptedUsername = await rl.question("ЛКО username: ");
    const promptedPassword = await rl.question("ЛКО password: ");
    return {
      username: promptedUsername.trim(),
      password: promptedPassword,
    };
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const headless = process.argv.includes("--headed") ? false : true;

  console.log("ЛКО login test\n");

  const envCreds = getCredentialsFromEnv();
  const sessionResult = await ensureJeventSession(envCreds ?? undefined, {
    headless,
  });

  if (sessionResult.status === "ready") {
    console.log("Session is ready.");
  } else {
    if (sessionResult.status === "failed") {
      console.log(`Previous login failed: ${sessionResult.message}`);
    }

    const credentials = await promptCredentials();

    console.log("Logging in...");
    const loginResult = await ensureJeventSession(credentials, { headless });

    if (loginResult.status !== "ready") {
      const message =
        loginResult.status === "failed"
          ? loginResult.message
          : "Login failed";
      throw new Error(message);
    }

    console.log("Login successful.");
  }

  const session = await createAuthenticatedContext({ headless });
  if (!session) {
    throw new Error("Session file missing after login.");
  }

  const { page, browser } = session;

  console.log(`Current URL: ${page.url()}`);
  console.log("Session saved to .data/session.json and .data/beta-token.json");

  const valid = await verifySession(page);
  if (!valid) {
    throw new Error("Session verification failed.");
  }

  const pollingUrl = JEVENT_URLS.polling(DEFAULT_EVENT_ID);
  console.log(`\nOpening polling page: ${pollingUrl}`);

  await page.goto(pollingUrl, { waitUntil: "domcontentloaded" });

  if (page.url().includes("/login") || page.url().includes("/auth/login")) {
    console.error("Cannot access polling page: redirected to login.");
    process.exitCode = 1;
  } else {
    console.log(`Polling page loaded: ${page.url()}`);
    console.log("Login flow verified.");
  }

  await browser.close();
}

main().catch((error: unknown) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
