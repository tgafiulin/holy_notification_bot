/** Нормализует ISO-дату из API в UTC ISO-строку. */
export function parseApiDateTime(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}
