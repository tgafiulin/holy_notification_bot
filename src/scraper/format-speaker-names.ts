import type { Speech } from "../models/jevent.js";

export function getSpeechAuthorNames(speech: Speech): string {
  const fromSpeakers = speech.speakers
    .map((speaker) => speaker.fullName.trim())
    .filter(Boolean);

  if (fromSpeakers.length > 0) {
    return fromSpeakers.join(", ");
  }

  const tempName = speech.tempSpeakerName?.trim();
  if (tempName) {
    return tempName;
  }

  return "—";
}
