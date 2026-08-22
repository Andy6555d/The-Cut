import type { NextRequest } from "next/server";

export const PLAYER_TIMEZONE_HEADER = "x-player-timezone";

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getRequestTimeZone(req: NextRequest): string {
  const requested = req.headers.get(PLAYER_TIMEZONE_HEADER)?.trim();
  return requested && isValidTimeZone(requested) ? requested : "UTC";
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Could not resolve local date for timezone ${timeZone}`);
  }

  return `${year}-${month}-${day}`;
}

export function getLocalPlayDate(req: NextRequest, now = new Date()): {
  timeZone: string;
  localDate: string;
} {
  const timeZone = getRequestTimeZone(req);
  return { timeZone, localDate: dateKeyInTimeZone(now, timeZone) };
}

export function worldwideCloseAtUtc(localDate: string): Date {
  // A local calendar date is still in progress somewhere on Earth until
  // UTC-12 reaches the following midnight. For YYYY-MM-DD D, that moment
  // is D+1 at 12:00 UTC. Waiting until then means a worldwide ranking for D
  // cannot be finalised while any legitimate player can still be on D.
  const [year, month, day] = localDate.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Invalid local date");
  return new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0, 0));
}
