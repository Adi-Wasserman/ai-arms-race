/**
 * Today's date as YYYY-MM-DD in the USER'S LOCAL calendar.
 *
 * Do NOT use `new Date().toISOString().slice(0, 10)` for "today" — that
 * yields the UTC date, which differs from the local calendar date near
 * midnight. Epoch rows are plain calendar dates (quarter ends like
 * 2026-06-30), so comparing them against the UTC date can wrongly hide
 * the freshest quarter as a "future projection" for users behind UTC.
 */
export function localTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
