import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import "dotenv/config";

import {
  createAuthenticatedContext,
  loginWithPlaywright,
  verifySession,
} from "../auth/login.js";
import { JEVENT_URLS } from "../config/urls.js";

async function promptCredentials(): Promise<{ username: string; password: string }> {
  const username = process.env.JEVENT_USERNAME;
  const password = process.env.JEVENT_PASSWORD;

  if (username && password) {
    console.log("Using credentials from environment variables.");
    return { username, password };
  }

  const rl = createInterface({ input, output });

  try {
    const promptedUsername = await rl.question("jEvent username: ");
    const promptedPassword = await rl.question("jEvent password: ");
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

  console.log("jEvent login test\n");

  let session = await createAuthenticatedContext({ headless });

  if (session) {
    const valid = await verifySession(session.page);
    if (valid) {
      console.log("Existing session is valid.");
    } else {
      console.log("Saved session expired, logging in again...");
      await session.browser.close();
      session = null;
    }
  }

  if (!session) {
    const credentials = await promptCredentials();
    console.log("Logging in...");
    session = await loginWithPlaywright(credentials, { headless });
    console.log("Login successful.");
  }

  const { page, browser } = session;

  console.log(`Current URL: ${page.url()}`);
  console.log(`Session saved to .data/session.json`);

  const eventId = process.env.JEVENT_EVENT_ID ?? "100924";
  const pollingUrl = JEVENT_URLS.polling(eventId);
  console.log(`\nOpening polling page: ${pollingUrl}`);

  await page.goto(pollingUrl, { waitUntil: "domcontentloaded" });

  if (page.url().includes("/login")) {
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
