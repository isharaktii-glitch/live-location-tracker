import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config(); // Loads .env.local automatically

const sql = neon(process.env.NEXT_PUBLIC_NEON_DB_URL!);

export async function POST(request: Request) {
  const body = await request.json();
  
  if (!body.url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

  try {
    // Extract Video ID (handles /watch?v=ID, /embed/ID, etc.)
    const match = body.url.match(/(?:\/watch\?v=|\/embed\/|\/shorts\/)([^&]+)/i);
    
    if (!match || !match[1]) throw new Error("Invalid YouTube format");

    const realVideoId = match[1];
    
    // Generate a cryptographically random short ID (e.g., 'A7B3C9')
    const shortCode = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();

    // Insert into database with empty GPS fields initially (filled on click)
    await sql`INSERT INTO geo_sessions 
               (short_code, original_video_id) 
               VALUES (${shortCode}, ${realVideoId})`;

    return NextResponse.json({ success: true, shortCode });

  } catch (error) {
    console.error("Generation Error:", error);
    return NextResponse.json({ error: "Server processing failed" }, { status: 500 });
  }
}
