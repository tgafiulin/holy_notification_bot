/** ЛКО serializes Java LocalDateTime as [y, m, d, h, min, s, nano?]. */
export function parseJeventDateTimeArray(value: number[] | null | undefined): Date | null {
  if (value == null || value.length < 3) {
    return null;
  }

  const [year, month, day, hour = 0, minute = 0, second = 0] = value;
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute, second);
}
