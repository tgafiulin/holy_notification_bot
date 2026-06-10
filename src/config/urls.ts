export const JUGRU_AUTH_BASE_URL = "https://my.jugru.org";
export const JUGRU_EVENT_BASE_URL = "https://beta.jugru.org";

export const JEVENT_URLS = {
  login: `${JUGRU_AUTH_BASE_URL}/auth/login-password`,
  polling: (eventId: number | string) =>
    `${JUGRU_EVENT_BASE_URL}/jug-ru-group/events/${eventId}/voting-panel`,
  proposals: (eventId: number | string) =>
    `${JUGRU_EVENT_BASE_URL}/api/v2/events/${eventId}/program/proposals`,
  pcMembers: (eventId: number | string) =>
    `${JUGRU_EVENT_BASE_URL}/api/v2/events/${eventId}/team/members`,
  assignmentCandidates: (eventId: number | string) =>
    `${JUGRU_EVENT_BASE_URL}/api/v2/events/${eventId}/program/proposals/assignments/candidates`,
} as const;

export const SESSION_FILE = ".data/session.json";
