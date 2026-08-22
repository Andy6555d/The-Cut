import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAnalyticsEvents } from "@/lib/analytics/writer";
import { getOrCreateAnonymousPlayer, attachAnonymousCookie } from "@/lib/domain/identity/anonymousPlayer";

const eventSchema=z.object({eventName:z.string().min(1).max(64),properties:z.record(z.unknown()).default({}),occurredAt:z.string()});
const payloadSchema=z.object({sessionId:z.string().uuid(),events:z.array(eventSchema).min(1).max(50)});

export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null);const parsed=payloadSchema.safeParse(body);if(!parsed.success)return NextResponse.json({error:"invalid_payload"},{status:400});
 const player=await getOrCreateAnonymousPlayer(req);const{sessionId,events}=parsed.data;
 const receivedAt=new Date().toISOString();
 await writeAnalyticsEvents(events.map((e: { eventName: string; properties: Record<string, unknown>; occurredAt: string })=>({eventName:e.eventName,sessionId,playerId:player.playerId,properties:e.properties,occurredAt:receivedAt})));
 const res=new NextResponse(null,{status:204});if(player.isNew)attachAnonymousCookie(res,player.anonymousKey);return res;
}
