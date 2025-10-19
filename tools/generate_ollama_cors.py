#!/usr/bin/env python3
"""
generate_ollama_cors.py
Auto-discovers SlopAI extension IDs for Chrome/Edge/Firefox (if installed) and writes a secure Ollama CORS YAML.
- No wildcards.
- If a browser/ID isn't found, it's simply omitted.
- You can override/augment detection with CLI flags: --chrome-id=XXX --edge-id=YYY --firefox-id=ZZZ
Usage:
    python generate_ollama_cors.py -o ollama_cors.yaml
    python generate_ollama_cors.py -o ollama_cors.yaml --chrome-id=abc... --firefox-id=123...
"""
import argparse, json, os, sys, re
from pathlib import Path

def guess_os():
    if os.name == "nt":
        return "windows"
    if sys.platform == "darwin":
        return "mac"
    return "linux"

def find_chrome_ids():
    # On Chrome/Edge, extension IDs are directory names under profile Extensions folder.
    # We'll try common paths and look for folders containing a manifest.json with name "SlopAI".
    results = set()
    system = guess_os()

    candidates = []
    if system == "windows":
        localapp = os.environ.get("LOCALAPPDATA", "")
        candidates += [
            Path(localapp) / "Google/Chrome/User Data/Default/Extensions",
            Path(localapp) / "Google/Chrome/User Data/Profile 1/Extensions",
            Path(localapp) / "Microsoft/Edge/User Data/Default/Extensions",
            Path(localapp) / "Microsoft/Edge/User Data/Profile 1/Extensions",
        ]
    elif system == "mac":
        home = Path.home()
        candidates += [
            home / "Library/Application Support/Google/Chrome/Default/Extensions",
            home / "Library/Application Support/Microsoft Edge/Default/Extensions",
        ]
    else:
        home = Path.home()
        candidates += [
            home / ".config/google-chrome/Default/Extensions",
            home / ".config/chromium/Default/Extensions",
            home / ".config/microsoft-edge/Default/Extensions",
        ]

    for base in candidates:
        if not base.exists():
            continue
        for ext_id_dir in base.iterdir():
            if not ext_id_dir.is_dir():
                continue
            # Check subversion folders
            for ver in ext_id_dir.iterdir():
                if not ver.is_dir():
                    continue
                manifest_path = ver / "manifest.json"
                if manifest_path.exists():
                    try:
                        data = json.loads(manifest_path.read_text(encoding="utf-8"))
                        name = data.get("name", "").lower()
                        if "slopai" in name or name == "SlopAI":
                            results.add(ext_id_dir.name)
                    except Exception:
                        pass
    return results

def find_firefox_ids():
    # Firefox uses "moz-extension://" but IDs are dynamic per install; we cannot know ahead of time.
    # However, if the extension is temporarily installed during dev, there's no stable ID to discover offline.
    # We therefore skip auto-discovery and rely on optional --firefox-id override.
    return set()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--output", default="ollama_cors.yaml", help="Output YAML file path")
    ap.add_argument("--chrome-id", action="append", default=[], help="Add a Chrome extension ID")
    ap.add_argument("--edge-id", action="append", default=[], help="Add an Edge extension ID")
    ap.add_argument("--firefox-id", action="append", default=[], help="Add a Firefox extension ID (moz-extension)")
    args = ap.parse_args()

    chrome_ids = set(args.chrome_id)
    edge_ids = set(args.edge_id)
    firefox_ids = set(args.firefox_id)

    # Auto-discover on disk (best-effort)
    discovered = find_chrome_ids()
    # We cannot perfectly distinguish Chrome vs Edge IDs from disk layout above; include them in chrome_ids.
    chrome_ids |= discovered

    # Construct allow_origins list
    allow = []
    for cid in sorted(chrome_ids):
        if re.fullmatch(r"[a-p]{32}", cid):  # Chrome/Edge IDs are 32 chars a-p
            allow.append(f'  - "chrome-extension://{cid}"')
            # Edge uses the same scheme, but separate IDs can be added via --edge-id

    for eid in sorted(edge_ids):
        if re.fullmatch(r"[a-p]{32}", eid):
            allow.append(f'  - "chrome-extension://{eid}"')  # Edge also uses chrome-extension:// scheme

    for fid in sorted(firefox_ids):
        # Firefox temporary IDs vary; we accept anything non-empty
        if fid.strip():
            allow.append(f'  - "moz-extension://{fid}"')

    content = "cors:\n  allow_origins:\n"
    if allow:
        content += "\n".join(allow) + "\n"
    else:
        # No prompts; safe default with empty list
        content += "    # No extensions detected; add IDs with --chrome-id/--edge-id/--firefox-id\n"
        content += "    # Example:\n"
        content += '    # - "chrome-extension://bhjibocimcmjaienpcfjaapabaionijf"\n'

    # Default loopback listen
    content += '\nlisten: "127.0.0.1:11434"\n'

    Path(args.output).write_text(content, encoding="utf-8")
    print(f"Wrote {args.output}")
    print(content)

if __name__ == "__main__":
    main()