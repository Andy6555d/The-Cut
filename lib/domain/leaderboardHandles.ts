import { getSupabaseServerClient } from "@/lib/db/supabase-server";

// Used anywhere a leaderboard needs to show a name for a player without
// exposing anything beyond what the player themselves chose to set.
export async function resolveHandles(playerIds: string[]): Promise<Map<string, string>> {
  const handles = new Map<string, string>();
  if (playerIds.length === 0) return handles;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("players").select("id, display_name").in("id", playerIds);

  for (const row of data ?? []) {
    const id = row.id as string;
    const displayName = row.display_name as string | null;
    handles.set(id, displayName && displayName.trim().length > 0 ? displayName : `Player #${id.slice(0, 6).toUpperCase()}`);
  }

  // Cover any id that somehow didn't come back from the query.
  for (const id of playerIds) {
    if (!handles.has(id)) handles.set(id, `Player #${id.slice(0, 6).toUpperCase()}`);
  }

  return handles;
}
