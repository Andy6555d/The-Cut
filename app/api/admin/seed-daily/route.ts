import { NextRequest, NextResponse } from "next/server";
import { seedDailyForDate } from "@/lib/domain/daily-generation/seedDailyForDate";
import { requireAdmin } from "@/lib/domain/admin/auth";

export async function POST(req:NextRequest){
  if(!(await requireAdmin(req)))return NextResponse.json({error:"unauthorized"},{status:401});
  const body=await req.json().catch(()=>({})); const date=typeof body.date==="string"?body.date:new Date().toISOString().slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return NextResponse.json({error:"invalid_date"},{status:400});
  const result=await seedDailyForDate(date);return NextResponse.json(result,{status:result.ok?200:500});
}
