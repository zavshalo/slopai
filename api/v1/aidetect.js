export default async function handler(req, res) {
  // --- Allow browser extensions to call this endpoint ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Restrict to POST requests
  if (req.method !== "POST") {
    res.status(405).json({ error: "Expected POST" });
    return;
  }

  try {
    // --- Parse the request body safely ---
    let body = "";
    for await (const chunk of req) body += chunk;
    const data = JSON.parse(body || "{}");

    const text = data.text || "";
    if (!text.trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    console.log(`[${new Date().toISOString()}] len=${text.length}`);

    // --- Prepare headers ---
    const headers = { "Content-Type": "application/json" };
    if (process.env.SAPLING_KEY) {
      headers["Authorization"] = `Key ${process.env.SAPLING_KEY}`;
    }

    // --- Call Sapling's demo endpoint (no key required) ---
    const sapling = await fetch("https://api.sapling.ai/api/v1/aidetect-demo", {
      method: "POST",
      headers,
      body: JSON.stringify({ text })
    });

    // --- Handle and safely parse the response ---
    let resultText = await sapling.text();
    let result;
    try {
      // Sometimes the demo returns extra text before JSON
      result = JSON.parse(resultText.replace(/^[^{]+/, ""));
    } catch (e) {
      console.error("Failed to parse Sapling response:", resultText);
      result = { error: "Invalid JSON from Sapling demo", raw: resultText };
    }

    console.log(`→ Sapling ${sapling.status} ai_prob=${result.ai_probability ?? "?"}`);
    res.status(sapling.status).json(result);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy failure", detail: String(err) });
  }
}

