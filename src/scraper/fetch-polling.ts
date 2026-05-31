import type { APIRequestContext } from "playwright";

import { JEVENT_URLS } from "../config/urls.js";
import type { PollingResponse } from "../models/jevent.js";

export type FetchPollingOptions = {
  eventId: string | number;
  excludedStatuses?: string[];
  excludedInternalStatuses?: number[];
};

const DEFAULT_BODY = {
  excludedStatuses: [] as string[],
  excludedInternalStatuses: [] as number[],
};

export async function fetchPollingData(
  request: APIRequestContext,
  options: FetchPollingOptions,
): Promise<PollingResponse> {
  const url = JEVENT_URLS.votePolling(options.eventId);
  const body = {
    excludedStatuses: options.excludedStatuses ?? DEFAULT_BODY.excludedStatuses,
    excludedInternalStatuses:
      options.excludedInternalStatuses ??
      DEFAULT_BODY.excludedInternalStatuses,
  };

  const response = await request.post(url, {
    data: body,
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(
      `Polling request failed: HTTP ${response.status()} ${text.slice(0, 200)}`,
    );
  }

  return (await response.json()) as PollingResponse;
}
