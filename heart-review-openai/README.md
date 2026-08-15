# Heart English Review · OpenAI API version

Files:
- `index.html` — August Advanced Four-Day Workweek review prototype
- `api/check-english.js` — minimal grammar/spelling correction for custom student input
- `api/transcribe.js` — audio transcription
- `api/feedback.js` — compares saved My Script with transcript and returns focused feedback

Required Vercel environment variable:
- `OPENAI_API_KEY` = your existing key

Important:
- Never paste the API key into `index.html`.
- The browser calls same-origin `/api/*`; the API key stays server-side.
- Browser TTS is still used for Listen buttons.
- CRM writing is not included in this package yet; the feedback payload is ready to be forwarded to a CRM endpoint later.
