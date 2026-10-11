export function loadSession() {
  try {
    const history = JSON.parse(sessionStorage.getItem('dada_chat_history')) || [];
    const leadFormShown = sessionStorage.getItem('dada_lead_form_shown') === 'true';
    const leadSubmitted = sessionStorage.getItem('dada_lead_submitted') === 'true';
    const language = sessionStorage.getItem('dada_chat_language') || '';
    return { history, leadFormShown, leadSubmitted, language };
  } catch (e) {
    console.error('[Chatbot] Failed to restore session:', e);
    return { history: [], leadFormShown: false, leadSubmitted: false, language: '' };
  }
}

export function saveSession(history, leadFormShown, leadSubmitted, language) {
  try {
    sessionStorage.setItem('dada_chat_history', JSON.stringify(history));
    sessionStorage.setItem('dada_lead_form_shown', leadFormShown ? 'true' : 'false');
    sessionStorage.setItem('dada_lead_submitted', leadSubmitted ? 'true' : 'false');
    if (language) {
      sessionStorage.setItem('dada_chat_language', language);
    }
  } catch (e) {
    console.error('[Chatbot] Failed to save session:', e);
  }
}
