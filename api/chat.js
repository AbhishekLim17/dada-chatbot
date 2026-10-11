const { handleCors } = require('../lib/middleware/cors');
const { getClientIp, checkRateLimit } = require('../lib/middleware/ratelimit');
const { validateChatInput } = require('../lib/middleware/validate');
const llm = require('../lib/services/llm');
const { logError, logWarn, logEvent } = require('../lib/services/logger');
const { validateEnv } = require('../lib/services/env');

validateEnv();

module.exports = async function handler(req, res) {
  try {
    const corsOk = handleCors(req, res);
    if (!corsOk) {
      logWarn('VALIDATION_ERROR', 'CORS Blocked: Origin not allowed on chat endpoint');
      return res.status(403).json({ error: 'Forbidden: Origin not allowed' });
    }
    if (req.method === 'OPTIONS') return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, 20)) {
      logWarn('RATE_LIMIT', 'Rate limit hit on chat endpoint');
      return res.status(429).json({
        error: 'Too many messages. Please wait a moment before trying again.'
      });
    }

    // Validate input
    const valError = validateChatInput(req.body);
    if (valError) {
      logWarn('VALIDATION_ERROR', `Chat validation failed: ${valError}`);
      return res.status(400).json({ error: valError });
    }

    const { message, history = [], language = 'de' } = req.body;

    try {
      const reply = await llm.getLLMReply(message, history, language);
      logEvent('CHAT_SUCCESS', 'LLM reply sent successfully');
      return res.status(200).json({ reply });
    } catch (err) {
      logError('CHAT_ERROR', 'LLM chat execution failed', err);
      return res.status(500).json({
        error: 'Sorry, I had trouble processing your message. Please try again in a moment.'
      });
    }
  } catch (err) {
    logError('UNEXPECTED_ERROR', 'Unexpected error in chat handler', err);
    return res.status(500).json({
      error: 'Sorry, I had trouble processing your message. Please try again in a moment.'
    });
  }
};
