const { SYSTEM_PROMPT } = require('../knowledge/system-prompt');
const { logError, logEvent } = require('./logger');

// ── Provider Configuration ──────────────────────────────────────────────────
const PROVIDERS = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    primaryModel: 'llama-3.3-70b-versatile',
    fallbackModel: 'llama-3.1-8b-instant',
    getApiKey: () => process.env.GROQ_API_KEY,
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    })
  },
  gemini: {
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    primaryModel: 'gemini-3.6-flash',
    fallbackModel: 'gemini-3.5-flash-lite',
    getApiKey: () => process.env.GEMINI_API_KEY,
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    })
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    primaryModel: 'google/gemma-4-31b-it:free',
    fallbackModel: 'google/gemma-4-26b-a4b-it:free',
    getApiKey: () => process.env.OPENROUTER_API_KEY,
    headers: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://hausofdada.online',
      'X-Title': 'Haus of DADA AI Assistant'
    })
  }
};

// ── Language map ─────────────────────────────────────────────────────────────
const LANGUAGE_NAMES = {
  de: 'German',
  en: 'English',
  fr: 'French'
};

// ── Build OpenAI-format messages array ───────────────────────────────────────
function buildMessages(message, history, language) {
  const activeLangName = LANGUAGE_NAMES[language] || 'German';
  const systemContent = SYSTEM_PROMPT +
    `\n\nCRITICAL CONVERSATION RULE:\nThe active language for this conversation is ${activeLangName}. You MUST respond ONLY in ${activeLangName}. Do not switch languages.`;

  const messages = [
    { role: 'system', content: systemContent }
  ];

  // Append conversation history (already in {role, content} format)
  for (const msg of history) {
    const content = (msg.content || '').trim();
    if (!content) continue;

    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    messages.push({ role, content });
  }

  // Append the current user message
  messages.push({ role: 'user', content: message.trim() });

  return messages;
}

// ── Call a single provider + model ───────────────────────────────────────────
async function callProvider(provider, modelName, messages) {
  const apiKey = provider.getApiKey();
  if (!apiKey) {
    throw new Error(`${provider.name} API key is not configured`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

  try {
    const response = await fetch(provider.baseUrl, {
      method: 'POST',
      headers: provider.headers(apiKey),
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        max_tokens: 2048, // thinking models (Gemini 3) spend part of this on reasoning
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const err = new Error(`${provider.name} API error: ${response.status} ${errorBody.slice(0, 300)}`);
      err.status = response.status;
      err.body = errorBody;
      throw err;
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error(`${provider.name} returned unexpected response format`);
    }

    return data.choices[0].message.content;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`${provider.name} request timed out after 12s`);
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    throw err;
  }
}

// ── Check if error is retryable on fallback provider ─────────────────────────
function isRetryableOnFallback(err) {
  const status = err.status || 0;
  // 429 = rate limit, 5xx = server errors, timeout
  return status === 429 || status >= 500 || status === 408;
}

// ── Main entry point — fallback chain ────────────────────────────────────────
async function getLLMReply(message, history = [], language = 'de') {
  const messages = buildMessages(message, history, language);
  const groq = PROVIDERS.groq;
  const gemini = PROVIDERS.gemini;
  const openrouter = PROVIDERS.openrouter;

  // ── Step 1: Try Groq primary model ────────────────────────────────────────
  if (groq.getApiKey()) {
    try {
      const reply = await callProvider(groq, groq.primaryModel, messages);
      logEvent('LLM_SUCCESS', `${groq.name}/${groq.primaryModel} replied successfully`);
      return reply;
    } catch (err) {
      logError('LLM_ERROR', `${groq.name}/${groq.primaryModel} failed`, err);

      // Try Groq fallback model if not a rate limit error
      if (!isRetryableOnFallback(err)) {
        try {
          const reply = await callProvider(groq, groq.fallbackModel, messages);
          logEvent('LLM_SUCCESS', `${groq.name}/${groq.fallbackModel} fallback succeeded`);
          return reply;
        } catch (fallbackErr) {
          logError('LLM_ERROR', `${groq.name}/${groq.fallbackModel} fallback also failed`, fallbackErr);
        }
      }
    }
  }

  // ── Step 2: Try Gemini ────────────────────────────────────────────────────
  if (gemini.getApiKey()) {
    try {
      const reply = await callProvider(gemini, gemini.primaryModel, messages);
      logEvent('LLM_SUCCESS', `${gemini.name}/${gemini.primaryModel} fallback succeeded`);
      return reply;
    } catch (err) {
      logError('LLM_ERROR', `${gemini.name}/${gemini.primaryModel} fallback failed`, err);
      // Try Gemini fallback model
      try {
        const reply = await callProvider(gemini, gemini.fallbackModel, messages);
        logEvent('LLM_SUCCESS', `${gemini.name}/${gemini.fallbackModel} fallback succeeded`);
        return reply;
      } catch (fallbackErr) {
        logError('LLM_ERROR', `${gemini.name}/${gemini.fallbackModel} fallback also failed`, fallbackErr);
      }
    }
  }

  // ── Step 3: Try OpenRouter ────────────────────────────────────────────────
  if (openrouter.getApiKey()) {
    try {
      const reply = await callProvider(openrouter, openrouter.primaryModel, messages);
      logEvent('LLM_SUCCESS', `${openrouter.name}/${openrouter.primaryModel} fallback succeeded`);
      return reply;
    } catch (orErr) {
      logError('LLM_ERROR', `${openrouter.name} fallback also failed`, orErr);
      throw orErr;
    }
  }

  throw new Error('All configured LLM providers failed to respond.');
}

module.exports = { getLLMReply };
