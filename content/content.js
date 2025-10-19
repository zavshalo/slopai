
const BADGE_CLASS = "slopai-badge-img";
const ATTR_HASH = "data-slopai-hash";
const LABEL_TO_FILE = {
  "AI": "badges/AI.png",
  "MIXED": "badges/MIXED.png",
  "HUMAN": "badges/HUMAN.png"
};

function hashText(t) {
  let h = 2166136261 >>> 0;
  for (let i=0;i<t.length;i++) { h ^= t.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h.toString(16);
}

function selectPostNodes() {
  const selectors = [
    'div[data-id][data-urn]',
    'div.feed-shared-update-v2',
    'article',
    'div.feed-shared-update-v3',
  ];
  let nodes = [];
  selectors.forEach(sel => nodes.push(...document.querySelectorAll(sel)));
  return Array.from(new Set(nodes));
}

function extractText(node) {
  const tNodes = node.querySelectorAll('span.break-words, div.update-components-text, div.feed-shared-inline-show-more-text, p, span');
  let parts = [];
  tNodes.forEach(n => {
    const txt = n.innerText || n.textContent || "";
    if (txt && txt.trim().length > 0) parts.push(txt.trim());
  });
  let text = parts.join(" ").replace(/\s+/g, " ").trim();
  if (!text) text = (node.innerText || "").replace(/\s+/g, " ").trim();
  return text;
}

function ensureBadgeContainer(node) {
  let host = node.querySelector(".slopai-badge-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "slopai-badge-host";
    const header = node.querySelector('header, div.update-components-header, div.feed-shared-header');
    if (header) {
      header.style.position ||= "relative";
      header.appendChild(host);
    } else {
      node.style.position ||= "relative";
      node.appendChild(host);
    }
  }
  return host;
}

function showBadge(node, label) {
  const host = ensureBadgeContainer(node);
  let img = host.querySelector("img." + BADGE_CLASS);
  if (!img) {
    img = document.createElement("img");
    img.className = BADGE_CLASS;
    img.width = 56; img.height = 56;
    img.alt = "SlopAI " + label;
    img.style.opacity = "0";
    img.style.transition = "opacity 180ms ease-out, transform 180ms ease-out";
    host.appendChild(img);
    requestAnimationFrame(()=>{ img.style.opacity = "1"; img.style.transform = "translateY(0)"; });
  }
  const path = LABEL_TO_FILE[label] || LABEL_TO_FILE["MIXED"];
  img.src = chrome.runtime.getURL(path);
  img.alt = "SlopAI " + label;
  img.title = "SlopAI: " + label;
}

async function classifyAndLabel(node) {
  const text = extractText(node).slice(0, 2400);
  if (!text) return;
  const h = hashText(text);
  if (node.getAttribute(ATTR_HASH) === h) return;
  node.setAttribute(ATTR_HASH, h);
  try {
    const res = await chrome.runtime.sendMessage({ type: "CLASSIFY", text });
    if (res?.label) showBadge(node, res.label.toUpperCase());
  } catch (e) {}
}

function scanAll() { selectPostNodes().forEach(n => classifyAndLabel(n)); }
const obs = new MutationObserver(() => {
  if ("requestIdleCallback" in window) requestIdleCallback(scanAll, { timeout: 1500 });
  else setTimeout(scanAll, 500);
});
obs.observe(document.documentElement, { childList: true, subtree: true });
scanAll();
