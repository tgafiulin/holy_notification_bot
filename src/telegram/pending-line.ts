import type { PendingAssignment } from "../models/program.js";
import { escapeHtml } from "./html.js";

export function formatPendingItemLine(
  item: Pick<PendingAssignment, "authorNames" | "proposalTitle">,
): string {
  return `• ${escapeHtml(item.authorNames)} — ${escapeHtml(item.proposalTitle)}`;
}
