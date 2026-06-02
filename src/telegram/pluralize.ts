/** Склонение «заявка / заявки / заявок» для целого count ≥ 0. */
export function pluralizeApplications(count: number): string {
  if (count === 1) {
    return "заявка";
  }
  if (count < 5) {
    return "заявки";
  }
  return "заявок";
}
