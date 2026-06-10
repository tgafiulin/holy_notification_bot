import type { APIRequestContext } from "playwright";

import { DEFAULT_EVENT_ID } from "../config/constants.js";
import { JEVENT_URLS } from "../config/urls.js";

export async function isSessionValid(
  request: APIRequestContext,
  eventId: string = DEFAULT_EVENT_ID,
): Promise<boolean> {
  try {
    const response = await request.get(JEVENT_URLS.proposals(eventId), {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    return response.ok();
  } catch {
    return false;
  }
}
