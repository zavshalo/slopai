export default async function handler(req, res) {
  // Enable CORS for browser extensions
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
    const body = await req.json();
    const text = body.text || "";
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

    const data = await sapling.json();
    console.log(`→ Sapling ${sapling.status} ai_prob=${data.ai_probability ?? "?"}`);
    res.status(sapling.status).json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy failure", detail: String(err) });
  }
}

