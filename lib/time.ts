const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** ISO 8601, Asia/Seoul 오프셋 고정: 2026-11-04T07:12:30+09:00 */
export function toKstIso(date: Date = new Date()): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 19) + "+09:00";
}

export function kstDay(date: Date = new Date()): string {
  return toKstIso(date).slice(0, 10);
}

export function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function isValidDay(day: string | null): day is string {
  return !!day && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`));
}
