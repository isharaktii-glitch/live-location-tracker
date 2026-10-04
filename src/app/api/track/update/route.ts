import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.NEXT_PUBLIC_NEON_DB_URL!);

export async function POST(request: Request) {
   const body = await request.json(); 
  
   if (!body.shortCode || !body.lat || !body.long) return new Response(JSON.stringify({ error: "Missing data" }), { status: 400 });

   try {
      // Update DB with latest coords and timestamp to create a "Live" feel
      await sql`UPDATE geo_sessions SET last_lat=${body.lat}, last_long=${body.long}, last_seen=NOW() WHERE short_code=${body.shortCode}`;
      
      console.log(`✅ Updated Session ${body.shortCode}: Lat=${body.lat}, Long=${body.long}`);
      return NextResponse.json({success:true, updated:true});
   } catch (e) { 
        console.error("Update Error", e); 
        return NextResponse.json({error:"DB Fail"},{status:500}) 
   } 
}
