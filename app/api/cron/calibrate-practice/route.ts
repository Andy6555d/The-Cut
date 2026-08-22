import { NextRequest,NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/domain/admin/auth";
import { calibratePractice } from "@/lib/domain/calibration/calibratePractice";
export async function GET(req:NextRequest){if(!cronAuthorized(req))return NextResponse.json({error:"unauthorized"},{status:401});try{return NextResponse.json({status:"ok",...(await calibratePractice())})}catch(e){return NextResponse.json({error:"calibration_failed",detail:e instanceof Error?e.message:"unknown"},{status:500})}}
