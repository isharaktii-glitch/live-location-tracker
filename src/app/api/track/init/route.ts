import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.NEXT_PUBLIC_NEON_DB_URL!);

export async function POST(request: Request) {
  const body = await request.json(); 
  
  if (!body.shortCode) return new Response(JSON.stringify({ error: "No shortCode" }), { status: 400 });

  try {
    // Fetch existing session to get the REAL VIDEO ID before redirecting
    let result = await sql`SELECT * FROM geo_sessions WHERE short_code = ${body.shortCode}`;

    if (result.length === 0) throw new Error("Session not found");

    const sessData = result[0];

    // Get Client IP from headers immediately upon first load
    const clientIp = request.headers.get('x-forwarded-for') || 'Unknown';

    return NextResponse.json({ 
      success: true, 
      originalVideoId: sessData.original_video_id, 
      ipAddress: clientIp 
    });

  } catch (e) { 
     console.error(e); 
     return NextResponse.json({error:"Init failed"},{status:500}) 
  }
}
