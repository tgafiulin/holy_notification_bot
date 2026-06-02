import type { PendingVote } from "../models/jevent.js";
import { escapeHtml } from "./html.js";

export function formatPendingItemLine(
  item: Pick<PendingVote, "authorNames" | "speechTitle">,
): string {
  return `• ${escapeHtml(item.authorNames)} — ${escapeHtml(item.speechTitle)}`;
}
