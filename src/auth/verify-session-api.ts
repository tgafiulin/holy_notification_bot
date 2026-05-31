import type { APIRequestContext } from "playwright";

import { DEFAULT_EVENT_ID } from "../config/constants.js";
import { JEVENT_URLS } from "../config/urls.js";
import type { PollingResponse } from "../models/jevent.js";

export async function isSessionValid(
  request: APIRequestContext,
  eventId: string = process.env.JEVENT_EVENT_ID ?? DEFAULT_EVENT_ID,
): Promise<boolean> {
  try {
    const response = await request.post(JEVENT_URLS.votePolling(eventId), {
      data: {
        excludedStatuses: [],
        excludedInternalStatuses: [],
      },
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (!response.ok()) {
      return false;
    }

    const data = (await response.json()) as PollingResponse;
    return Array.isArray(data.speeches);
  } catch {
    return false;
  }
}
