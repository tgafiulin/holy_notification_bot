import type { APIRequestContext } from "playwright";

import { JEVENT_URLS } from "../config/urls.js";
import type { InternalStatus } from "../models/jevent.js";

export async function fetchInternalStatuses(
  request: APIRequestContext,
  eventId: string | number,
): Promise<InternalStatus[]> {
  const response = await request.get(JEVENT_URLS.internalStatuses(eventId), {
    headers: {
      Accept: "application/json, text/plain, */*",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(
      `Internal statuses request failed: HTTP ${response.status()} ${text.slice(0, 200)}`,
    );
  }

  return (await response.json()) as InternalStatus[];
}

export function flattenInternalStatuses(
  statuses: InternalStatus[],
): InternalStatus[] {
  const result: InternalStatus[] = [];

  for (const status of statuses) {
    result.push(status);
    if (status.children.length > 0) {
      result.push(...flattenInternalStatuses(status.children));
    }
  }

  return result;
}

export function findInternalStatusIdByName(
  statuses: InternalStatus[],
  name: string,
): number | null {
  const match = flattenInternalStatuses(statuses).find(
    (status) => status.name === name,
  );
  return match?.id ?? null;
}
