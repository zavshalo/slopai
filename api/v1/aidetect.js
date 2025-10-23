export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ... existing logic below ...
}

// Force Node runtime so process.env and standard fetch work
export const config = { runtime: "nodejs" };

console.log("ACTIVE FUNCTION BUILD >>> vQueryParamKey");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  try {
    const { text } = req.body || {};
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Missing text" });
    }

    console.log(`[${new Date().toISOString()}] len=${text.length}`);

    // 🔑  Temporary embedded key — works via query string
    const SAPLING_KEY = "WS5D5ZJV0IWP8X45PVOJXDRNPXTJ3L9G";

    const saplingURL = `https://api.sapling.ai/api/v1/aidetect?key=${SAPLING_KEY}`;

    const sapling = await fetch(saplingURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await sapling.json();
    console.log(`→ Sapling ${sapling.status} ai_prob=${data.ai_probability ?? "?"}`);

    res.status(sapling.status).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy failure", detail: err.message });
  }
}


