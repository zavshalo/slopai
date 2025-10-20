# SlopAI Proxy (Plug & Play)
This serverless proxy relays text classification requests from the SlopAI browser extension to Sapling's AI Detector.

## Deploy on Vercel
1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click **"Import Project"**
3. Upload this folder or link a GitHub repo with these files
4. Deploy
5. Copy your deployment URL — e.g.:
   `https://slopai-cloud.vercel.app/api/v1/aidetect`
6. Paste that into your SlopAI extension as the API host

### Optional Environment Variable
| Key | Description |
|-----|--------------|
| SAPLING_KEY | Your Sapling API key (optional). Enables higher rate limits. |

Logs will appear in the Vercel console showing timestamp, text length, and AI probability. No IPs or personal data are logged.
