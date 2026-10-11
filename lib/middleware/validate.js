const MAX_MESSAGE_LENGTH = 500;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateLeadInput(body) {
  const {
    name = '',
    email = '',
    company = '',
    phone = '',
    country = '',
    website = '',
    service = '',
    budget = '',
    timeline = ''
  } = body || {};

  if (typeof name !== 'string' || !name.trim()) return 'Name is required.';
  if (name.length > 100) return 'Name is too long (max 100 characters).';

  if (typeof email !== 'string' || !email.trim() || !isValidEmail(email.trim())) {
    return 'A valid email address is required.';
  }
  if (email.length > 100) return 'Email is too long (max 100 characters).';

  if (typeof company !== 'string') return 'Invalid company field.';
  if (company.length > 150) return 'Company name is too long (max 150 characters).';

  if (typeof phone !== 'string') return 'Invalid phone field.';
  if (phone.length > 50) return 'Phone number is too long (max 50 characters).';

  if (typeof country !== 'string') return 'Invalid country field.';
  if (country.length > 100) return 'Country name is too long (max 100 characters).';

  if (typeof website !== 'string') return 'Invalid website field.';
  if (website.length > 200) return 'Website URL is too long (max 200 characters).';

  if (typeof service !== 'string') return 'Invalid service field.';
  if (service.length > 100) return 'Service is too long (max 100 characters).';

  if (typeof budget !== 'string') return 'Invalid budget field.';
  if (budget.length > 100) return 'Budget option is too long (max 100 characters).';

  if (typeof timeline !== 'string') return 'Invalid timeline field.';
  if (timeline.length > 100) return 'Timeline option is too long (max 100 characters).';

  return null;
}

function validateContactInput(body) {
  const {
    name = '',
    email = '',
    brand = '',
    phone = '',
    service = '',
    budget = '',
    brief = '',
    timeline = ''
  } = body || {};

  if (typeof name !== 'string' || !name.trim()) return 'Name is required.';
  if (name.length > 100) return 'Name is too long (max 100 characters).';

  if (typeof email !== 'string' || !email.trim() || !isValidEmail(email.trim())) {
    return 'A valid email address is required.';
  }
  if (email.length > 100) return 'Email is too long (max 100 characters).';

  if (typeof brand !== 'string') return 'Invalid company/brand field.';
  if (brand.length > 150) return 'Company/brand name is too long (max 150 characters).';

  if (typeof phone !== 'string') return 'Invalid phone field.';
  if (phone.length > 50) return 'Phone number is too long (max 50 characters).';

  if (typeof service !== 'string') return 'Invalid service field.';
  if (service.length > 100) return 'Service is too long (max 100 characters).';

  if (typeof budget !== 'string') return 'Invalid budget field.';
  if (budget.length > 100) return 'Budget option is too long (max 100 characters).';

  if (typeof timeline !== 'string') return 'Invalid timeline field.';
  if (timeline.length > 100) return 'Timeline option is too long (max 100 characters).';

  if (typeof brief !== 'string' || !brief.trim()) return 'Project brief description is required.';
  if (brief.length > 5000) return 'Brief is too long (max 5000 characters).';

  return null;
}

function validateChatInput(body) {
  const { message, history } = body || {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return 'Message is required.';
  }
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`;
  }
  if (history) {
    if (!Array.isArray(history)) return 'History must be an array.';
    if (history.length > 20) return 'History is too long.';
    for (const turn of history) {
      if (typeof turn !== 'object' || turn === null) return 'Invalid turn in history.';
      if (typeof turn.role !== 'string' || typeof turn.content !== 'string') {
        return 'Invalid history turn structure.';
      }
      if (turn.role !== 'user' && turn.role !== 'assistant') return 'Invalid history role.';
      if (turn.content.length > 1000) return 'History message too long.';
    }
  }
  return null;
}

function validateAnalyticsInput(body) {
  const { eventName, language, service, leadScore, country, messageCount, sessionId } = body || {};

  const SUPPORTED_EVENTS = [
    'CHAT_OPEN',
    'MESSAGE_SENT',
    'LANGUAGE_DETECTED',
    'LANGUAGE_CHANGED',
    'SERVICE_INTEREST',
    'LEAD_FORM_SHOWN',
    'LEAD_SUBMITTED',
    'CONVERSATION_ABANDONED'
  ];

  if (typeof eventName !== 'string' || !SUPPORTED_EVENTS.includes(eventName)) {
    return 'Invalid or missing eventName.';
  }

  if (language !== undefined && language !== '') {
    if (typeof language !== 'string' || !['de', 'en', 'fr'].includes(language.toLowerCase())) {
      return 'Invalid language code.';
    }
  }

  if (leadScore !== undefined && leadScore !== '') {
    if (typeof leadScore !== 'string' || !['LOW', 'MEDIUM', 'HIGH'].includes(leadScore.toUpperCase())) {
      return 'Invalid leadScore.';
    }
  }

  if (service !== undefined && service !== '') {
    if (typeof service !== 'string' || service.length > 150) {
      return 'Invalid service interest field.';
    }
  }

  if (country !== undefined && country !== '') {
    if (typeof country !== 'string' || country.length > 100) {
      return 'Invalid country field.';
    }
  }

  if (messageCount !== undefined && messageCount !== null && messageCount !== '') {
    const parsed = Number(messageCount);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return 'Invalid messageCount (must be positive integer).';
    }
  }

  if (sessionId !== undefined && sessionId !== '') {
    if (typeof sessionId !== 'string' || !/^[a-f0-9-]{36}$/i.test(sessionId)) {
      return 'Invalid sessionId.';
    }
  }

  return null;
}

module.exports = { validateLeadInput, validateContactInput, validateChatInput, validateAnalyticsInput, isValidEmail, MAX_MESSAGE_LENGTH };
