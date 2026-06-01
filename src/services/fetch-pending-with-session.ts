import {
  ensureJeventSession,
  getCredentialsFromEnv,
} from "../auth/ensure-session.js";
import { createAuthenticatedClient } from "../auth/authenticated-client.js";
import { fetchPendingSummary, type PendingSummary } from "./fetch-pending-summary.js";

export type FetchPendingWithSessionResult =
  | { ok: true; summary: PendingSummary }
  | { ok: false; kind: "needs_credentials"; message: string }
  | { ok: false; kind: "session_failed"; message: string }
  | { ok: false; kind: "fetch_error"; message: string };

export async function fetchPendingWithSession(
  eventId?: string,
): Promise<FetchPendingWithSessionResult> {
  const sessionResult = await ensureJeventSession(getCredentialsFromEnv() ?? undefined);

  if (sessionResult.status === "needs_credentials") {
    return {
      ok: false,
      kind: "needs_credentials",
      message:
        "Сессия jEvent не настроена. Укажите JEVENT_USERNAME и JEVENT_PASSWORD в .env или войдите через бота.",
    };
  }

  if (sessionResult.status === "failed") {
    return {
      ok: false,
      kind: "session_failed",
      message: sessionResult.message,
    };
  }

  let client: Awaited<ReturnType<typeof createAuthenticatedClient>> | undefined;

  try {
    client = await createAuthenticatedClient();
    const summary = await fetchPendingSummary(client.request, eventId);
    return { ok: true, summary };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка при загрузке данных";

    if (message.includes("No saved session")) {
      return {
        ok: false,
        kind: "needs_credentials",
        message: "Нет сохранённой сессии jEvent.",
      };
    }

    return { ok: false, kind: "fetch_error", message };
  } finally {
    await client?.dispose();
  }
}
