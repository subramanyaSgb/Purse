/**
 * Date-range helpers that respect the user's IST locale.
 *
 * The transactionsRepo's range queries take ISO UTC strings; the user
 * thinks in IST. These helpers convert a JS Date to the inclusive UTC
 * start / exclusive UTC end of the IST day, week, or month that contains
 * it.
 *
 * IST = UTC+5:30, no DST. We shift `Date.UTC(y, m, d)` by −5:30h to land
 * on midnight IST.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function fromIstLocal(year: number, month0: number, day: number): string {
  return new Date(Date.UTC(year, month0, day) - IST_OFFSET_MS).toISOString();
}

/** Read year / month / day from a Date as seen in IST. */
function istParts(d: Date): { y: number; m: number; day: number; dow: number } {
  const istMs = d.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);
  return {
    y: ist.getUTCFullYear(),
    m: ist.getUTCMonth(),
    day: ist.getUTCDate(),
    dow: ist.getUTCDay(),
  };
}

export function startOfDayIST(d: Date): string {
  const { y, m, day } = istParts(d);
  return fromIstLocal(y, m, day);
}

export function endOfDayIST(d: Date): string {
  const { y, m, day } = istParts(d);
  return fromIstLocal(y, m, day + 1);
}

/** Monday as week start (matches the design's "Week" chip). */
export function startOfWeekIST(d: Date): string {
  const { y, m, day, dow } = istParts(d);
  // Convert Sunday = 0 → 7 so Monday becomes 1 day from start of week.
  const daysSinceMonday = (dow + 6) % 7;
  return fromIstLocal(y, m, day - daysSinceMonday);
}

export function endOfWeekIST(d: Date): string {
  const { y, m, day, dow } = istParts(d);
  const daysSinceMonday = (dow + 6) % 7;
  return fromIstLocal(y, m, day - daysSinceMonday + 7);
}

export function startOfMonthIST(d: Date): string {
  const { y, m } = istParts(d);
  return fromIstLocal(y, m, 1);
}

export function endOfMonthIST(d: Date): string {
  const { y, m } = istParts(d);
  return fromIstLocal(y, m + 1, 1);
}

/** Last N days, inclusive of today's IST day. */
export function startOfLastNDaysIST(d: Date, n: number): string {
  const { y, m, day } = istParts(d);
  return fromIstLocal(y, m, day - (n - 1));
}

/** Range preset → {start, end} pair, shared by Dashboard + Activity. */
export type DashboardRangePreset = 'thisMonth' | 'last7d' | 'last30d' | 'lastMonth' | 'allTime';

export function boundsFor(
  preset: DashboardRangePreset,
  now: Date = new Date(),
): { start: string; end: string } {
  switch (preset) {
    case 'thisMonth':
      return { start: startOfMonthIST(now), end: endOfMonthIST(now) };
    case 'last7d':
      return { start: startOfWeekIST(now), end: endOfWeekIST(now) };
    case 'last30d':
      return { start: startOfLastNDaysIST(now, 30), end: new Date().toISOString() };
    case 'lastMonth': {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return { start: startOfMonthIST(lastMonth), end: endOfMonthIST(lastMonth) };
    }
    case 'allTime':
      return { start: '1970-01-01T00:00:00.000Z', end: new Date(2999, 0).toISOString() };
  }
}
