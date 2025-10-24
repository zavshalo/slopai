export default async function handler(req, res) {
  try {
    // ✅ CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.status(200).end();

    // ✅ Basic success response
    return res.status(200).json({
      ok: true,
      service: "SlopAI Cloud Proxy",
      version: "v3.5.1",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Health check failed:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
