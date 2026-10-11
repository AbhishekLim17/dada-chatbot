import { CONFIG } from '../constants/config.js';

export function trackEvent(eventName, language = '', service = '', leadScore = '', country = '', messageCount = 0) {
  let sessionId = '';
  try {
    sessionId = sessionStorage.getItem('dada_chat_session_id') || '';
  } catch (e) {}

  let lang = language;
  if (!lang) {
    try {
      lang = sessionStorage.getItem('dada_chat_language') || '';
    } catch (e) {}
  }

  let count = messageCount;
  if (!count) {
    try {
      count = parseInt(sessionStorage.getItem('dada_chat_message_count') || '0', 10);
    } catch (e) {}
  }

  const payload = {
    eventName,
    language: lang,
    service,
    leadScore,
    country,
    messageCount: count,
    sessionId
  };

  var hasConsent = false;
  try {
    if (typeof window.DADA_HAS_ANALYTICS_CONSENT === 'function') {
      hasConsent = window.DADA_HAS_ANALYTICS_CONSENT();
    } else {
      var stored = JSON.parse(localStorage.getItem('dada_cookie_consent') || 'null');
      hasConsent = !!(stored && stored.analytics === true);
    }
  } catch (e) {}
  if (!hasConsent) return;

  fetch(CONFIG.API_ANALYTICS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function (r) {
    if (!r.ok) {
      console.warn('[Analytics] Failed to track event status:', r.status, r.statusText);
    }
  })
  .catch(err => console.error('[Analytics] Failed to track event error:', err));
}
