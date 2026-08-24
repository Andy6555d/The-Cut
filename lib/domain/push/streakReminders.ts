import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { dateKeyInTimeZone, hourInTimeZone } from "@/lib/domain/timezone/playerTimezone";
import { sendPushToPlayer } from "@/lib/domain/push/sendPush";

const REMINDER_START_HOUR = 19;
const REMINDER_END_HOUR = 21;

export interface StreakReminderResult {
  checked: number;
  sent: number;
  skipped?: string;
}

// See app/api/cron/streak-reminders/route.ts for the full reasoning on the
// local-hour approach. `ignoreHourWindow` exists only for the admin manual
// trigger — testing this at 11am shouldn't require waiting until evening.
export async function runStreakReminders(options?: { ignoreHourWindow?: boolean }): Promise<StreakReminderResult> {
  const supabase = getSupabaseServerClient();
  const now = new Date();

  const { data: subRows } = await supabase.from("push_subscriptions").select("player_id");
  const subscribedPlayerIds = Array.from(new Set((subRows ?? []).map((s: any) => s.player_id as string)));

  if (subscribedPlayerIds.length === 0) {
    return { checked: 0, sent: 0, skipped: "no_subscriptions" };
  }

  const { data: players } = await supabase.from("players").select("id, timezone").in("id", subscribedPlayerIds);

  const { data: streakRows } = await supabase
    .from("streaks")
    .select("player_id, current_streak, last_played_date, last_reminder_sent_date")
    .in("player_id", subscribedPlayerIds)
    .gt("current_streak", 0);

  const streakByPlayer = new Map<string, any>();
  for (const s of streakRows ?? []) streakByPlayer.set((s as any).player_id as string, s);

  let checked = 0;
  let sent = 0;

  for (const player of players ?? []) {
    const playerId = (player as any).id as string;
    const timeZone = (player as any).timezone as string | null;
    const streak = streakByPlayer.get(playerId);
    if (!timeZone || !streak) continue;

    checked += 1;

    if (!options?.ignoreHourWindow) {
      const localHour = hourInTimeZone(now, timeZone);
      if (localHour < REMINDER_START_HOUR || localHour >= REMINDER_END_HOUR) continue;
    }

    const localDate = dateKeyInTimeZone(now, timeZone);
    if (streak.last_played_date === localDate) continue;
    if (streak.last_reminder_sent_date === localDate) continue;

    const currentStreak = streak.current_streak as number;
    await sendPushToPlayer(playerId, {
      title: `🔥 ${currentStreak} day streak — don't lose it`,
      body: "Today's Cut is still waiting. One shot, a couple minutes.",
      url: "/daily",
    });

    await supabase.from("streaks").update({ last_reminder_sent_date: localDate }).eq("player_id", playerId);
    sent += 1;
  }

  return { checked, sent };
}
