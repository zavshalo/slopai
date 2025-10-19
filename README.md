# SlopAI

## Dynamic Ollama CORS YAML (secure, no `*`)

A helper script is included to generate a safe CORS config for Ollama that only whitelists your installed SlopAI extension IDs.

```bash
# from the extension folder
python tools/generate_ollama_cors.py -o ollama_cors.yaml
# optionally pass explicit IDs
python tools/generate_ollama_cors.py -o ollama_cors.yaml --chrome-id=<32charid> --edge-id=<32charid> --firefox-id=<uuid_or_token>
```

The output looks like:

```yaml
cors:
  allow_origins:
    - "chrome-extension://bhjibocimcmjaienpcfjaapabaionijf"

listen: "127.0.0.1:11434"
```

Notes:
- No popups or prompts are used by the extension; UI and logic remain identical to content/background behavior.
- Firefox's moz-extension IDs are ephemeral during temporary installs—pass them via `--firefox-id` if needed.
