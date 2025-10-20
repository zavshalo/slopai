export default async function handler(req, res) {
  // Enable CORS for the browser extension
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Expected POST" });
    return;
  }

  try {
    // ✅ FIX: Manually read the request body for Node.js runtime
    let body = "";
    for await (const chunk of req) body += chunk;
    const data = JSON.parse(body || "{}");

    const text = data.text || "";
    if (!text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    console.log(`[${new Date().toISOString()}] len=${text.length}`);

    const headers = { "Content-Type": "application/json" };
    if (process.env.SAPLING_KEY) {
      headers["Authorization"] = `Key ${process.env.SAPLING_KEY}`;
    }

    const sapling = await fetch("https://api.sapling.ai/api/v1/aidetect", {
      method: "POST",
      headers,
      body: JSON.stringify({ text })
    });

    const result = await sapling.json();
    console.log(`→ Sapling ${sapling.status} ai_prob=${result.ai_probability ?? "?"}`);
    res.status(sapling.status).json(result);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy failure", detail: String(err) });
  }
}
