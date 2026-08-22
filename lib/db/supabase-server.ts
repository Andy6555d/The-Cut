import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY. Uses the service role key, which bypasses Row Level Security.
// Never import this file from any component that runs in the browser.
// Only call it from app/api/** route handlers or server-only domain code.
//
// This project does not yet ship generated Supabase Database types. We still keep
// the Supabase client itself typed (SupabaseClient<any>) rather than returning
// plain `any`. That distinction matters: returning plain `any` erases the query
// builder method signatures and causes strict TypeScript to report callback
// parameters as implicit-any all over the app. The loose schema generic avoids
// false `unknown` row-field errors until generated Database types are introduced,
// while preserving the library's method/callback typing.
let cachedClient: SupabaseClient<any> | null = null;

export function getSupabaseServerClient(): SupabaseClient<any> {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Set both in Vercel → Project → Settings → Environment Variables."
    );
  }

  cachedClient = createClient<any>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}
