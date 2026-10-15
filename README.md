# DADA Chatbot

The Haus of DADA AI chat widget and its API, deployed on Vercel separately from the website.

Developer guide (architecture, env vars, gotchas, troubleshooting): [DEVELOPER.md](DEVELOPER.md)

- `chatbot/` — the widget (ES modules + CSS), served as static files
- `api/chat.js` — AI replies (Groq → Gemini → OpenRouter)
- `api/lead.js` — lead form → Google Sheets + email
- `api/analytics.js` — anonymised chat events → Google Sheets
- `lib/` — shared helpers (not deployed as functions)

## Add it to a website

```html
<link rel="stylesheet" href="https://<chatbot-host>/chatbot/chatbot.css">
<script type="module" src="https://<chatbot-host>/chatbot/chatbot.js"></script>
```

The widget calls the API on the host it was loaded from. The website must be listed in
`ALLOWED_ORIGIN_REGEX` in `lib/middleware/cors.js`, and its Content-Security-Policy must allow
`<chatbot-host>` in `script-src`, `style-src` and `connect-src`.

## Environment variables

See `.env.example`. At least one of `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` is required.
