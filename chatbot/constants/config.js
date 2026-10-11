// The API lives on the same host that serves this widget, so the website only needs the <script> tag.
const API_BASE = new URL(import.meta.url).origin;

export const CONFIG = {
  API_CHAT: API_BASE + '/api/chat',
  API_LEAD: API_BASE + '/api/lead',
  API_ANALYTICS: API_BASE + '/api/analytics',
  LEAD_TOKEN: '[COLLECT_LEAD]',
  GREETING_DELAY: 1200,
  MAX_MESSAGE_LENGTH: 500
};
