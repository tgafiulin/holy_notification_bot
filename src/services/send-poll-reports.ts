import type { Api } from "grammy";

import { PENDING_MESSAGE_PARSE_MODE } from "../bot/format-pending-messages.js";
import { collectPollReportRecipientIds } from "../voters/can-user-view-poll.js";
import type { VotersRegistry } from "../voters/types.js";

export async function sendPollReports(
  api: Api,
  adminUserId: number,
  registry: VotersRegistry,
  text: string,
  parseMode: typeof PENDING_MESSAGE_PARSE_MODE = PENDING_MESSAGE_PARSE_MODE,
): Promise<void> {
  const recipients = collectPollReportRecipientIds(adminUserId, registry);

  for (const userId of recipients) {
    await api.sendMessage(userId, text, { parse_mode: parseMode });
  }
}
