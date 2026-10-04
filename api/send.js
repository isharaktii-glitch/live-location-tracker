// api/send.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send();

    const { lat, lng, num } = req.body; // Data from frontend
    
    // Construct direct WhatsApp Web link or Meta API call
    const message = encodeURIComponent(`📍 *LIVE UPDATE*\nLat: ${lat}\nLng: ${lng}\nTime: ${new Date()}`);
    
    // Method A: Simple redirect to WhatsApp Web with pre-filled message (Free & No Token needed for simple text)
    // This opens a new tab on the receiver's phone/browser showing your chat
    const waUrl = `https://api.wa.me/v1/sendMessage?text=${message}&number=${num}`;

    try {
        await fetch(waUrl); 
        res.status(200).json({ success: true, url: waUrl });
    } catch(e) {
        console.error("Send error:", e);
        res.status(500).json({ error: "Failed" });
    }
}
