import { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";

export async function requireAdmin(req: NextRequest): Promise<{ userId: string; email: string | null } | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("auth_user_id, email")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (!admin) {
    const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((x: any) => x.trim().toLowerCase()).filter(Boolean);
    const email = data.user.email?.toLowerCase() ?? "";
    if (!email || !allow.includes(email)) return null;
  }
  return { userId: data.user.id, email: (admin?.email as string | null | undefined) ?? data.user.email ?? null };
}

export function cronAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${expected}`;
}
