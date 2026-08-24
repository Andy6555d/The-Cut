import webpush from "web-push";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@the-cutday.vercel.app";

  if (!publicKey || !privateKey) {
    throw new Error(
      "Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY. Set both in Vercel → Project → Settings → Environment Variables."
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string; // where a tap on the notification should open, relative path
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Sends to every subscription a player has (multiple devices/browsers).
// Any subscription the push service reports as gone (410) or not found
// (404) is deleted — a stale subscription left in the table forever would
// just accumulate silent failures with no way to notice.
export async function sendPushToPlayer(playerId: string, payload: PushPayload): Promise<{ sent: number; removed: number }> {
  ensureConfigured();
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("player_id", playerId);

  const subscriptions = (data ?? []) as SubscriptionRow[];
  let sent = 0;
  let removed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent += 1;
    } catch (err: any) {
      const statusCode = err?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        removed += 1;
      }
      // Any other error (network blip, temporary service outage) is left
      // alone — worth logging, not worth deleting a subscription over.
    }
  }

  return { sent, removed };
}
