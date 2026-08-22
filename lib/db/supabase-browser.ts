"use client";

import { createClient } from "@supabase/supabase-js";

// BROWSER-SAFE. Uses only the public anon key. Because every Phase A table
// has Row Level Security enabled with no public policies yet, this client
// currently cannot read or write anything directly — it exists so later
// phases (e.g. reading public leaderboard views) have a ready-made client,
// and so Supabase Auth (magic link / OAuth sign-up) can be wired up later
// without another scaffolding pass.

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  cachedClient = createClient(url, anonKey);
  return cachedClient;
}
