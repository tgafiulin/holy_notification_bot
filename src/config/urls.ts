export const JEVENT_BASE_URL = "https://jevent.jugru.org";

export const JEVENT_URLS = {
  login: `${JEVENT_BASE_URL}/login`,
  loginSubmit: `${JEVENT_BASE_URL}/spring_security_check`,
  polling: (eventId: number | string) =>
    `${JEVENT_BASE_URL}/polling/${eventId}`,
  votePolling: (eventId: number | string) =>
    `${JEVENT_BASE_URL}/ajax/vote/${eventId}/polling/`,
  internalStatuses: (eventId: number | string) =>
    `${JEVENT_BASE_URL}/ajax/internal-status/event/${eventId}/`,
} as const;

export const SESSION_FILE = ".data/session.json";
