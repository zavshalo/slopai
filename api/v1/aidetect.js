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

    const headers = { "Content-Type": "application/json" };
    if (process.env.SAPLING_KEY)
      headers["Authorization"] = `Key ${process.env.SAPLING_KEY}`;

    const sapling = await fetch("https://api.sapling.ai/api/v1/aidetect", {
      method: "POST",
      headers,
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
