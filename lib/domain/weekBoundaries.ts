// Monday-start UTC weeks, used consistently for league weekly standings.
// Not tied to local-midnight per-player timezones — a league's weekly
// cycle is a shared clock for the group, same reasoning as why the
// original architecture wanted one shared Daily: a "this week" that meant
// something different per member would defeat the point of a recurring
// group competition.

export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const daysSinceMonday = (dayOfWeek + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString().slice(0, 10);
}

export function getWeekEnd(weekStartDateStr: string): string {
  const d = new Date(weekStartDateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

export function currentWeekStart(): string {
  return getWeekStart(new Date().toISOString().slice(0, 10));
}

export function previousWeekStart(): string {
  const thisWeek = currentWeekStart();
  const d = new Date(thisWeek + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}
