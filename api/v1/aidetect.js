export default async function handler(req, res) {
  try {
    // ✅ CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing 'text' in request body" });
    }

    // ✅ example scoring logic (replace with your real AI inference)
    const fakeScore = Math.random(); // placeholder for real model call
    const result = {
      score: fakeScore,
      text,
      label: fakeScore >= 0.5 ? "AI" : fakeScore >= 0.1 ? "MIXED" : "HUMAN",
      version: "v3.5.1",
    };

    return res.status(200).json(result);
  } catch (err) {
    console.error("Detection error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
