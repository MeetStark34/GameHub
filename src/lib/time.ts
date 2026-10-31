/** UTC calendar helpers. Daily identity always uses UTC, never local time. */

export type UtcDate = string; // 'YYYY-MM-DD'

export const toUtcDate = (d: Date): UtcDate => d.toISOString().slice(0, 10);

export const parseUtcDate = (s: UtcDate): Date => new Date(`${s}T00:00:00.000Z`);

export const isUtcDate = (s: unknown): s is UtcDate =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toUtcDate(parseUtcDate(s)) === s;

export const addDays = (s: UtcDate, days: number): UtcDate => {
  const d = parseUtcDate(s);
  d.setUTCDate(d.getUTCDate() + days);
  return toUtcDate(d);
};

/** Whole days from a to b (b - a). */
export const daysBetween = (a: UtcDate, b: UtcDate) =>
  Math.round((parseUtcDate(b).getTime() - parseUtcDate(a).getTime()) / 86_400_000);

/** The next 00:00 UTC strictly after `now`. */
export const nextUtcMidnight = (now: Date): Date => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return d;
};

/** Monday 00:00 UTC of the ISO week containing `now`. */
export const utcWeekStart = (now: Date): Date => {
  const day = (now.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
};

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
