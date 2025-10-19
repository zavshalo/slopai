
// SlopAI v3.2.2 background (MV3)
const DEFAULTS = {
  enabled: true,
  ollamaUrl: "http://127.0.0.1:11434",
  model: "mistral",
  maxCharsPerPost: 2400,
  timeoutMs: 45000
};

let health = {
  extensionRunning: true,
  ollamaReachable: false,
  modelReady: false,
  pulling: false,
  usingFallback: false,
  fallbackModel: null,
  lastCheck: 0,
  lastError: null,
  corsBlocked: false,
  edgeBlocked: false
};

function ts() {
  const d = new Date();
  const pad = (n)=> String(n).padStart(2, "0");
  return `[SlopAI ${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
}

function normalizeUrl(u) {
  if (!u) return "http://127.0.0.1:11434";
  try {
    if (!/^https?:\/\//i.test(u)) u = "http://" + u;
    const url = new URL(u);
    if (url.hostname === "localhost") url.hostname = "127.0.0.1";
    if (!url.port) url.port = "11434";
    return url.origin;
  } catch {
    return "http://127.0.0.1:11434";
  }
}

async function getCfg() {
  return new Promise((resolve) => chrome.storage.sync.get(DEFAULTS, cfg => resolve({...DEFAULTS, ...cfg})));
}

async function fetchJsonSafe(url, opts={}, retries=2, delayMs=1500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, opts);
      let data = null;
      try { data = await res.json(); } catch (err) {
        console.warn(ts(), "JSON parse failed (empty or invalid)", String(err));
      }
      if (!res.ok || !data) {
        console.warn(ts(), "HTTP not OK or empty body:", res.status, url);
        if (res.status === 403) {
          health.corsBlocked = true;
          health.lastError = "CORS or policy blocking localhost";
        }
        if (attempt < retries) { await new Promise(r => setTimeout(r, delayMs)); continue; }
        return { ok: false, data: data || {}, status: res.status };
      }
      return { ok: true, data, status: res.status };
    } catch (e) {
      console.warn(ts(), "Network error:", String(e));
      if (attempt < retries) { await new Promise(r => setTimeout(r, delayMs)); continue; }
      return { ok: false, data: { error: String(e) }, status: 0 };
    }
  }
  return { ok: false, data: { error: "Unknown" }, status: 0 };
}

function isEdge() { return /Edg\//.test(navigator.userAgent); }

async function waitOllamaReady(base, maxMs=90000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const r = await fetchJsonSafe(base + "/api/tags", {}, 0);
    if (r.ok && r.data && Array.isArray(r.data.models)) return r.data.models;
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error("Ollama not reachable");
}

async function ensureModelAvailable(base, name) {
  let models = await waitOllamaReady(base, 90000);
  const has = models.some(m => (m.name||"").toLowerCase().startsWith(name.toLowerCase()));
  if (has) return name;

  console.log(ts(), "Model missing -> pulling:", name);
  health.pulling = true;
  try {
    await fetch(base + "/api/pull", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name })
    });
  } catch (e) {
    console.warn(ts(), "Pull request failed:", String(e));
  }

  const start = Date.now();
  while (Date.now() - start < 120000) {
    models = await waitOllamaReady(base, 15000);
    const present = models.some(m => (m.name||"").toLowerCase().startsWith(name.toLowerCase()));
    if (present) { health.pulling = false; console.log(ts(), "Model pulled:", name); return name; }
    console.log(ts(), "Still pulling:", name);
    await new Promise(r => setTimeout(r, 2500));
  }

  // Fallback
  models = await waitOllamaReady(base, 10000);
  if (models.length > 0) {
    const fb = models[0].name;
    health.usingFallback = true;
    health.fallbackModel = fb;
    health.pulling = false;
    console.warn(ts(), "Falling back to:", fb);
    return fb;
  }
  health.pulling = false;
  throw new Error("No models installed");
}

async function checkHealth(force=false) {
  const now = Date.now();
  if (!force && now - health.lastCheck < 3000) return health;
  const cfg = await getCfg();
  const base = normalizeUrl(cfg.ollamaUrl);
  health.lastCheck = now;
  health.extensionRunning = true;
  health.lastError = null;
  health.ollamaReachable = false;
  health.modelReady = false;
  health.pulling = false;
  health.usingFallback = false;
  health.fallbackModel = null;
  health.corsBlocked = false;
  health.edgeBlocked = false;
  if (isEdge()) health.edgeBlocked = true;

  try {
    await waitOllamaReady(base, 60000);
    health.ollamaReachable = true;
    const modelToUse = await ensureModelAvailable(base, cfg.model);
    const gen = await fetchJsonSafe(base + "/api/generate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ model: modelToUse, prompt: "ok", stream: false, options: { num_predict: 1 } })
    }, 2, 1500);
    if (gen.ok && gen.data && typeof gen.data.response === "string") {
      health.modelReady = true;
      console.log(ts(), "Health OK, model:", modelToUse);
    } else {
      health.lastError = gen.data?.error || "Model not ready";
      console.warn(ts(), "Health generate failed:", health.lastError);
    }
  } catch (e) {
    health.lastError = String(e);
    console.warn(ts(), "Health error:", health.lastError);
  }
  return health;
}

function generateOllamaConfigYaml(extId) {
  const origin = `chrome-extension://${extId}`;
  return [
    "# SlopAI auto-generated config for Ollama CORS",
    "cors:",
    "  allow_origins:",
    `    - \"${origin}\"`,
    "",
    "listen: \"127.0.0.1:11434\"",
    ""
  ].join("\n");
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "HEALTH") {
      const h = await checkHealth(msg.force === true);
      sendResponse(h);
      return;
    }
    if (msg?.type === "CLASSIFY") {
      const cfg = await getCfg();
      if (!cfg.enabled) { sendResponse({ error: "disabled" }); return; }
      const text = (msg.text || "").slice(0, cfg.maxCharsPerPost);
      try {
        const base = normalizeUrl((await getCfg()).ollamaUrl);
        const h = await checkHealth(true);
        if (!h.modelReady) throw new Error(h.lastError || "Model not ready");
        const modelName = h.usingFallback ? h.fallbackModel : (await getCfg()).model;
        const res = await fetchJsonSafe(base + "/api/generate", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ model: modelName, prompt: text, stream: false })
        }, 2, 1500);
        if (!res.ok) throw new Error(res.data?.error || "Generate failed");
        const raw = (res.data.response || "").trim();
        const norm = raw.split(/\s+/)[0].toUpperCase();
        const label = ["AI","MIXED","HUMAN"].includes(norm) ? norm :
          (/^AI\b/i.test(raw) ? "AI" : /^Mixed\b/i.test(raw) ? "MIXED" :
          /^Human\b/i.test(raw) ? "HUMAN" : "MIXED");
        sendResponse({ label });
      } catch (e) {
        sendResponse({ error: String(e) });
      }
      return;
    }
    if (msg?.type === "GEN_CONFIG") {
      const id = chrome.runtime.id;
      const yaml = generateOllamaConfigYaml(id);
      sendResponse({ yaml, id });
      return;
    }
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
    chrome.storage.sync.set({ ...DEFAULTS, ...cfg });
  });
  console.log(ts(), "Installed");
});
