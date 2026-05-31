import type { APIRequestContext } from "playwright";

import { JEVENT_URLS } from "../config/urls.js";
import type { PcMember } from "../models/jevent.js";

export async function fetchPcMembers(
  request: APIRequestContext,
  eventId: string | number,
): Promise<PcMember[]> {
  const url = JEVENT_URLS.pcMembers(eventId);

  const response = await request.get(url, {
    headers: {
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(
      `PC members request failed: HTTP ${response.status()} ${text.slice(0, 200)}`,
    );
  }

  return (await response.json()) as PcMember[];
}
