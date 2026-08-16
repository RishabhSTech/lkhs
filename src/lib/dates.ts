/**
 * Stay dates are calendar dates, not instants. Everything is normalised to
 * UTC midnight so a night is identified identically on the server, in the
 * database (@db.Date) and in the browser regardless of local timezone.
 */

export function toUTCDate(input: Date | string): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Parses a plain "YYYY-MM-DD" into UTC midnight without local-timezone drift. */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function differenceInNights(checkIn: Date, checkOut: Date): number {
  const ms = toUTCDate(checkOut).getTime() - toUTCDate(checkIn).getTime();
  return Math.round(ms / 86_400_000);
}

/** The nights a stay occupies: check-in night through the night before checkout. */
export function eachNight(checkIn: Date, checkOut: Date): Date[] {
  const nights: Date[] = [];
  const start = toUTCDate(checkIn);
  const end = toUTCDate(checkOut);
  for (let d = start; d < end; d = addDays(d, 1)) nights.push(new Date(d));
  return nights;
}

export function eachDayInclusive(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  for (let d = toUTCDate(from); d <= toUTCDate(to); d = addDays(d, 1)) {
    days.push(new Date(d));
  }
  return days;
}

export function startOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

export function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()),
  );
}

export function isWeekendNight(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 5 || day === 6; // Friday and Saturday nights
}

export function todayUTC(): Date {
  return toUTCDate(new Date());
}
