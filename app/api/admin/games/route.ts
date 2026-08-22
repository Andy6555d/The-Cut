import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/domain/admin/auth";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
const schema=z.object({slug:z.string(),enabled:z.boolean()});
export async function GET(req:NextRequest){if(!(await requireAdmin(req)))return NextResponse.json({error:"unauthorized"},{status:401});const{data,error}=await getSupabaseServerClient().from("microgames").select("id,slug,category,enabled").order("slug");return error?NextResponse.json({error:"read_failed"},{status:500}):NextResponse.json({status:"ok",games:data??[]});}
export async function POST(req:NextRequest){if(!(await requireAdmin(req)))return NextResponse.json({error:"unauthorized"},{status:401});const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"invalid_payload"},{status:400});const{error}=await getSupabaseServerClient().from("microgames").update({enabled:parsed.data.enabled}).eq("slug",parsed.data.slug);return error?NextResponse.json({error:"update_failed"},{status:500}):NextResponse.json({status:"ok"});}
