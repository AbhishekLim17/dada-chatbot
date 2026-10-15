# DADA Chatbot — Developer Guide

Everything a developer needs to understand, run, change and debug the Haus of DADA AI chat assistant.

- **Repo:** https://github.com/AbhishekLim17/dada-chatbot
- **Live service:** https://hausofdada-chatbot.vercel.app (Vercel project `hausofdada-chatbot`)
- **Used by:** https://hausofdada.online (website repo `hausofDADA`, Vercel project `hausof_dada`)

---

## 1. What it is

A floating chat widget that answers visitor questions about Haus of DADA with an LLM, captures sales leads,
and logs anonymised chat events. It is a **standalone service**: the widget and its API live in this repo
and deploy on their own. A website embeds it with two tags; it needs no other code from this repo.

```
 Visitor's browser on hausofdada.online
 ┌──────────────────────────────────────────────┐
 │ website page                                  │
 │   <link  href=".../chatbot/chatbot.css">       │
 │   <script type="module" src=".../chatbot.js">  │──── loads widget files (static, CORS *)
 │                                                │
 │   widget  ── POST /api/chat ───────────────────┼──┐
 │           ── POST /api/lead ───────────────────┼──┤  hausofdada-chatbot.vercel.app
 │           ── POST /api/analytics (if consent) ─┼──┤  (Vercel serverless functions)
 └──────────────────────────────────────────────┘  │
                                                    ▼
             api/chat.js ──► Groq ─► Gemini ─► OpenRouter   (first that answers wins)
             api/lead.js ──► Google Sheets "Leads" tab + Gmail notification
             api/analytics.js ──► Google Sheets "Analytics" tab
```

---

## 2. Tech stack

| Layer | What is used | Notes |
|---|---|---|
| Widget | Vanilla JavaScript **ES modules**, plain CSS | No framework, no build step, no bundler. Files are served as-is. |
| API | Node.js **22.x** serverless functions on **Vercel** | CommonJS (`require`). One file in `api/` = one function. |
| AI | **Groq**, **Google Gemini**, **OpenRouter** via their OpenAI-compatible `/chat/completions` endpoints | Plain `fetch`, no SDKs. |
| Lead storage | **Google Sheets API** (`googleapis`) with a service account | Tabs `Leads` and `Analytics`. |
| Email | **Nodemailer** over Gmail SMTP with an app password | Sends the lead alert. |
| Hosting | Vercel Hobby plan | Auto-deploys on push to `main`. |

Dependencies: only `googleapis` and `nodemailer`. There is no test suite.

---

## 3. Repository layout

```
api/                      ← every .js here becomes a Vercel function (keep it to the 3 endpoints)
  chat.js                 POST /api/chat       — AI reply
  lead.js                 POST /api/lead       — lead form → Sheets + email, lead scoring
  analytics.js            POST /api/analytics  — chat events → Sheets
lib/                      ← shared server code (NOT functions; required with ../lib/...)
  knowledge/system-prompt.js   the AI's whole knowledge + behaviour rules (single source of truth)
  middleware/cors.js           allowed origins + security headers
  middleware/ratelimit.js      per-IP limits (in memory)
  middleware/validate.js       input validation for all three endpoints
  services/llm.js              provider chain, models, timeouts
  services/sheets.js           append a row to a tab
  services/email.js            Gmail notification (recipient is hard-coded here)
  services/env.js              env checks, runs when a function loads
  services/logger.js           JSON logs → Vercel runtime logs
chatbot/                  ← the widget, served statically at /chatbot/*
  chatbot.js              entry: builds the DOM, state, send/receive, language, reset, focus trap
  chatbot.css             all widget styles (prefixed .dada-*)
  constants/config.js     API URLs (derived from the widget's own origin), lead token, limits
  components/             messages, typing indicator, lead form, suggestion chips
  utils/                  language (detection + UI strings), markdown (safe), analytics
  storage/session.js      sessionStorage persistence
vercel.json               CORS header for /chatbot/*, cache, function timeouts
.env.example              all environment variables
```

---

## 4. How a chat message flows

1. **Widget loads.** `chatbot.js` builds its own HTML (`#dada-chat-widget`, `#dada-panel`, `#dada-input` …)
   and restores the conversation from `sessionStorage`.
2. **Language.** On first open with no language saved, the visitor picks EN / DE / FR. If they skip it and
   just type, `detectLanguage()` guesses from keywords (default German). The language is sent with every
   request and the server tells the model to answer **only** in that language.
3. **Send.** The widget POSTs `{ message, history, language }` to `/api/chat`. `history` is the **last 10**
   turns (`role` + `content` only). The widget aborts after **15 s**.
4. **Server checks**, in order: CORS origin → method → rate limit (**20/min per IP**) → validation
   (message ≤ 500 chars, history ≤ 20 turns, each ≤ 1000 chars).
5. **LLM chain** (`lib/services/llm.js`): system prompt + language rule + history + message go to the
   first provider that has a key:

   | Step | Provider | Models | Moves on when |
   |---|---|---|---|
   | 1 | Groq | `llama-3.3-70b-versatile`, then `llama-3.1-8b-instant` | any error (the 2nd model is skipped on 429/5xx/timeout) |
   | 2 | Gemini | `gemini-3.6-flash`, then `gemini-3.5-flash-lite` | any error |
   | 3 | OpenRouter | `google/gemma-4-31b-it:free` | — (last resort; its error is returned) |

   A provider whose key is not set is skipped. Each call has a **12 s** timeout, `max_tokens: 2048`,
   `temperature: 0.7`.
6. **Reply.** If the reply contains the token **`[COLLECT_LEAD]`**, the widget strips it and shows the lead
   form. The reply is rendered by `parseMarkdown()`, which **escapes HTML first** and then allows only
   bold, lists and `http(s)`/relative links.

### Lead form → `/api/lead`
Rate limit **5/min**. A hidden honeypot field `companyFax` rejects bots. A **lead score** is computed
(timeline + budget + filled-in company/website/phone → `LOW` / `MEDIUM` / `HIGH`). The row is appended to
the **`Leads`** tab and an HTML email is sent with `replyTo` = the visitor's email. The request succeeds if
*either* Sheets or email works; it returns 500 only when everything that is configured fails.

### Analytics → `/api/analytics`
Sent **only if the visitor accepted analytics cookies**: the widget calls the website's
`window.DADA_HAS_ANALYTICS_CONSENT()`, or falls back to `localStorage.dada_cookie_consent.analytics`.
Events: `CHAT_OPEN`, `MESSAGE_SENT`, `LANGUAGE_DETECTED`, `LANGUAGE_CHANGED`, `SERVICE_INTEREST`,
`LEAD_FORM_SHOWN`, `LEAD_SUBMITTED`, `CONVERSATION_ABANDONED`. Rate limit 60/min. It never fails the
visitor: write errors return `202`.

---

## 5. Environment variables

Set them in Vercel → `hausofdada-chatbot` → Settings → Environment Variables. **Changes only apply after
a redeploy.** For local work, `vercel env pull` writes them to `.env.local` (git-ignored).

| Variable | Required | Used by |
|---|---|---|
| `GEMINI_API_KEY` | at least **one** of the three AI keys | chat (current main provider) |
| `GROQ_API_KEY` | optional | chat. Currently removed: the old key failed and slowed every reply |
| `OPENROUTER_API_KEY` | optional | chat fallback |
| `GOOGLE_SHEET_ID` | for leads/analytics | Sheets: the id from the sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | for leads/analytics | the whole service-account JSON as one string; share the sheet with its `client_email` |
| `GMAIL_USER`, `GMAIL_PASS` | for lead emails | Gmail address + **app password** |

If **no** AI key is set, `validateEnv()` throws when the function loads and every endpoint crashes, not
just chat.

---

## 6. Embedding it in a website

```html
<link rel="stylesheet" href="https://hausofdada-chatbot.vercel.app/chatbot/chatbot.css">
<script type="module" src="https://hausofdada-chatbot.vercel.app/chatbot/chatbot.js"></script>
```

Three things must line up, or the widget silently fails:

1. **Allowed origin.** The site's origin must match `ALLOWED_ORIGIN_REGEX` in `lib/middleware/cors.js`
   (today: `localhost`, `127.0.0.1`, `hausofdada.de`, `hausofdada.online`, with or without `www`).
   Otherwise the API answers **403**.
2. **The site's Content-Security-Policy** must allow the chatbot host in `script-src`, `style-src` and
   `connect-src`. On hausofdada.online it is set in the website repo's `vercel.json`.
3. **CORS on the widget files.** Browsers only run a cross-origin `type="module"` script if it is served
   with `Access-Control-Allow-Origin`. This repo's `vercel.json` adds `*` for `/chatbot/*`; don't remove it.

The widget finds its API by itself: `config.js` uses `new URL(import.meta.url).origin`, so wherever the
widget is loaded from is where it sends requests. Moving to a custom domain (e.g. `chat.hausofdada.online`)
only needs the two tags and the website CSP updated.

---

## 7. Run, test and deploy

```bash
npm install
vercel link --project hausofdada-chatbot   # once
vercel env pull                            # writes .env.local
vercel dev --listen 3311                   # widget at http://localhost:3311/chatbot/chatbot.js
```

Quick API check (requests without an `Origin` header are allowed, so curl works):

```bash
curl -X POST http://localhost:3311/api/chat -H "Content-Type: application/json" -d "{\"message\":\"What services do you offer?\",\"history\":[],\"language\":\"en\"}"
```

To try the widget inside the real site locally, serve the website on another localhost port and point its
two tags at `http://localhost:3311` (localhost is an allowed origin).

**Deploy:** push to `main` → Vercel builds and deploys to production automatically. `vercel logs
hausofdada-chatbot.vercel.app` streams runtime logs; every log line is JSON with an `event` field
(`LLM_ERROR`, `LLM_SUCCESS`, `CHAT_ERROR`, `RATE_LIMIT`, `LEAD_SUCCESS`, `SHEET_ERROR`, `EMAIL_ERROR` …).
Provider errors include the first 300 characters of the provider's response, which normally names the cause.

---

## 8. Things you should know (gotchas)

1. **Only endpoints go in `api/`.** Vercel turns every `.js` file under `api/` into a function, and the Hobby
   plan allows **12**. Helpers belong in `lib/`. This broke deploys once: the build "completes" and then
   fails at *Deploying outputs*.
2. **Model names expire.** Providers retire models (`gemini-2.0-flash`, `gemini-1.5-flash` and the old
   OpenRouter Llama model all disappeared). The symptom is a **404** from the provider in `LLM_ERROR` logs.
   Fix: update the model ids in `lib/services/llm.js`.
3. **Thinking models eat `max_tokens`.** Gemini 3 spends part of the budget on hidden reasoning. At the old
   500, replies stopped mid-sentence; it is now 2048. Keep it high if you change models.
4. **Timeouts can stack past the widget's limit.** The widget gives up after 15 s, but the server can try
   several providers at up to 12 s each (and Vercel allows 30 s). If an early provider is slow rather than
   failing fast, the visitor sees a timeout even though a later provider would have answered. Keep broken
   providers' keys **out** of Vercel rather than relying on the fallback.
5. **The rate limiter is per instance, not global.** It is an in-memory `Map`; each serverless instance has
   its own, and it resets on cold start. It slows casual abuse but is not a hard cap. A real cap needs a
   shared store (e.g. Upstash Redis / Vercel KV).
6. **CORS is not authentication.** Browsers enforce it; `curl` and servers can call the API freely (no
   `Origin` header is allowed). Your AI bill is protected only by the rate limit and the providers' own
   limits. Keep provider-side spending caps on.
7. **The AI's knowledge is one file.** `lib/knowledge/system-prompt.js` holds the company facts, services,
   packages, tone, when to emit `[COLLECT_LEAD]`, and handoff rules. To change what the bot says, edit
   this file; nothing else. Visitors can try prompt injection; the prompt holds no secrets, so the worst
   case is an off-topic answer.
8. **`[COLLECT_LEAD]` is a contract** between the prompt and the widget (`CONFIG.LEAD_TOKEN`). If you
   rename it in one place, rename it in both.
9. **Stale `.de` references.** `hausofdada.de` no longer exists, but it is still in:
   `lib/services/email.js` (lead alert recipient `vision@hausofdada.de`, so **lead emails bounce** until
   changed), the system prompt (website + contact lines) and the widget's thank-you text in
   `chatbot/utils/language.js`.
10. **Widget files are cached for 5 minutes** (`Cache-Control: max-age=300`) and the module imports are not
    versioned. After a deploy, visitors may run old widget code for a few minutes. Avoid deploys that change
    the request/response shape of the API and the widget at the same time; make the API accept both shapes
    first.
11. **Sheets tab names matter.** Rows go to the tabs named `Leads` and `Analytics`; if a tab is missing,
    the row lands in the **first** tab instead. Every append also reads the sheet metadata (two API calls).
12. **Errors in env setup surface at load time.** `validateEnv()` runs when a function file is first
    required. A missing AI key crashes the function before the handler runs, and Vercel shows a generic
    500 or `FUNCTION_INVOCATION_FAILED`.
13. **Session data lives in `sessionStorage`** (`dada_chat_history`, `dada_chat_language`,
    `dada_chat_session_id`, `dada_chat_message_count`, `dada_lead_form_shown`, `dada_lead_submitted`). It is
    per tab and cleared when the tab closes. The reset button in the panel clears it.
14. **Privacy.** Chat messages go to the AI providers; lead data goes to Google Sheets and Gmail. The
    website's privacy page names the providers ("Google Gemini and optionally OpenRouter"). If you add or
    switch a provider, update that page in the website repo too (GDPR).
15. `window.DadaChatbot` exposes `openPanel()`, `closePanel()` and `performReset()` for testing and for
    site buttons that should open the chat.

---

## 9. Common changes

| Task | Where |
|---|---|
| Change what the bot knows or how it behaves | `lib/knowledge/system-prompt.js` |
| Switch or update AI models / provider order | `PROVIDERS` and `getLLMReply()` in `lib/services/llm.js` |
| Allow a new website to embed the widget | `ALLOWED_ORIGIN_REGEX` in `lib/middleware/cors.js` + that site's CSP |
| Change the lead alert recipient | `to:` in `lib/services/email.js` |
| Change lead-form fields | `chatbot/components/leadForm.js` + `validateLeadInput` + the row in `api/lead.js` |
| Change widget text / add a UI string | `chatbot/utils/language.js` |
| Change look and feel | `chatbot/chatbot.css` |
| Add a language | `language.js` (strings + detection), the language picker in `chatbot.js`, `LANGUAGE_NAMES` in `llm.js`, `validateAnalyticsInput` in `validate.js` |
| Change rate limits | the `checkRateLimit(ip, N)` call in each `api/*.js` |
| Change message length limits | `MAX_MESSAGE_LENGTH` in `validate.js` **and** `CONFIG.MAX_MESSAGE_LENGTH` in `config.js` |

---

## 10. Troubleshooting

| Symptom | Likely cause | Check / fix |
|---|---|---|
| Widget button doesn't appear | CSP blocks the script, or the module has no CORS header | Browser console; site CSP `script-src`; `/chatbot/*` header in `vercel.json` |
| "Sorry, I had trouble…" on every message | Every provider failed | `vercel logs` → `LLM_ERROR` lines: 401 = bad key, 404 = model gone, 429 = quota |
| `403 Forbidden: Origin not allowed` | Site origin not in the regex | `lib/middleware/cors.js` |
| Reply cut off mid-sentence | `max_tokens` too low for a thinking model | `llm.js` |
| Slow replies (8 s+) | A broken provider is tried first | Remove its key in Vercel and redeploy |
| Timeout message in the widget | Provider chain exceeded 15 s | Logs; remove slow providers |
| Leads not in the sheet | Sheet not shared with the service account, wrong tab name, bad JSON | `SHEET_ERROR` in logs |
| Lead emails missing | Gmail app password, or the recipient address bounces | `EMAIL_ERROR` in logs; `email.js` |
| Env change has no effect | Not redeployed | Redeploy the project |
| Deploy fails at "Deploying outputs" | More than 12 files in `api/` | Move helpers to `lib/` |

---

## 11. Known limitations and ideas

- No automated tests; verify by hand or with a headless browser (open the site, ask a question, check the reply).
- Rate limiting is per instance (see gotcha 5).
- Replies are not streamed from the server; the widget animates the finished reply.
- Language detection for typed messages is a simple keyword match and defaults to German.
- No conversation storage on the server; only analytics events and leads are kept.
