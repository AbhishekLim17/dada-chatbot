const { handleCors } = require('../lib/middleware/cors');
const { getClientIp, checkRateLimit } = require('../lib/middleware/ratelimit');
const sheetsService = require('../lib/services/sheets');
const { logError, logWarn, logEvent } = require('../lib/services/logger');
const { validateEnv } = require('../lib/services/env');
const { validateAnalyticsInput } = require('../lib/middleware/validate');

validateEnv();

module.exports = async function handler(req, res) {
  try {
    const corsOk = handleCors(req, res);
    if (!corsOk) {
      logWarn('VALIDATION_ERROR', 'CORS Blocked: Origin not allowed on analytics endpoint');
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.method === 'OPTIONS') return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate Limiting (60 requests/minute per IP)
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, 60)) {
      logWarn('RATE_LIMIT', 'Rate limit hit on analytics endpoint');
      return res.status(429).json({ error: 'Too many requests' });
    }

    const valError = validateAnalyticsInput(req.body);
    if (valError) {
      logWarn('INVALID_EVENT', `Analytics validation failed: ${valError}`);
      return res.status(400).json({ error: valError });
    }

    const {
      eventName,
      language = '',
      service = '',
      leadScore = '',
      country = '',
      messageCount = null,
      sessionId = ''
    } = req.body || {};

    const timestamp = new Date().toISOString();
    // Row layout: Timestamp | Event | Language | Service | Lead Score | Country | Message Count | Session ID
    const row = [
      timestamp,
      eventName,
      language,
      service,
      leadScore,
      country,
      messageCount === undefined || messageCount === null ? '' : messageCount,
      sessionId
    ];

    const success = await sheetsService.appendToSheet(row, 'Analytics');
    if (!success) {
      logError('ANALYTICS_WRITE_FAILED', `Failed to write analytics event: ${eventName}`, new Error('Sheets append returned false'));
      return res.status(202).json({ success: true, message: 'Accepted (write deferred)' });
    }

    logEvent('ANALYTICS_SUCCESS', `Event recorded: ${eventName}`, { eventName });
    return res.status(200).json({ success: true });
  } catch (err) {
    logError('UNEXPECTED_ERROR', 'Unexpected error in analytics handler', err);
    return res.status(202).json({ success: true, message: 'Accepted (recovered from error)' });
  }
};
