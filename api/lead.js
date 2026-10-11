const { handleCors } = require('../lib/middleware/cors');
const { getClientIp, checkRateLimit } = require('../lib/middleware/ratelimit');
const { validateLeadInput } = require('../lib/middleware/validate');
const sheetsService = require('../lib/services/sheets');
const emailService = require('../lib/services/email');
const { logError, logWarn, logEvent } = require('../lib/services/logger');
const { validateEnv } = require('../lib/services/env');

validateEnv();

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')
    .replace(/\r/g, '');
}

module.exports = async function handler(req, res) {
  try {
    const corsOk = handleCors(req, res);
    if (!corsOk) {
      logWarn('VALIDATION_ERROR', 'CORS Blocked: Origin not allowed on lead endpoint');
      return res.status(403).json({ error: 'Forbidden: Origin not allowed' });
    }
    if (req.method === 'OPTIONS') return;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate Limiting (Aligned to 5 requests/minute per IP)
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, 5)) {
      logWarn('RATE_LIMIT', 'Rate limit hit on lead endpoint');
      return res.status(429).json({ error: 'Too many requests' });
    }

    // Spam Honeypot Check
    const { companyFax = '' } = req.body || {};
    if (companyFax) {
      logWarn('SPAM_DETECTED', 'Spam attempt detected on lead endpoint');
      return res.status(400).json({ error: 'Request rejected.' });
    }

    // Validate Input
    const valError = validateLeadInput(req.body);
    if (valError) {
      logWarn('VALIDATION_ERROR', `Lead validation failed: ${valError}`);
      return res.status(400).json({ error: valError });
    }

    const {
      name     = '',
      company  = '',
      email    = '',
      phone    = '',
      country  = '',
      website  = '',
      service  = '',
      budget   = '',
      timeline = '',
    } = req.body;

    // Calculate Lead Score (Low, Medium, High)
    let score = 0;
    
    // Timeline score mapping
    const cleanTimeline = timeline.trim().toLowerCase();
    if (cleanTimeline.includes('asap')) {
      score += 4;
    } else if (cleanTimeline.includes('1 month')) {
      score += 3;
    } else if (cleanTimeline.includes('1-3') || cleanTimeline.includes('1–3')) {
      score += 2;
    } else if (cleanTimeline.includes('3-6') || cleanTimeline.includes('3–6')) {
      score += 1;
    }
    
    // Budget score mapping
    const cleanBudget = budget.trim().toLowerCase();
    if (cleanBudget.includes('15,000+')) {
      score += 4;
    } else if (cleanBudget.includes('5,000') && cleanBudget.includes('15,000')) {
      score += 3;
    } else if (cleanBudget.includes('1,000') && cleanBudget.includes('5,000')) {
      score += 2;
    } else if (cleanBudget.includes('under') && cleanBudget.includes('1,000')) {
      score += 1;
    }
    
    // Context profile completeness points
    if (company.trim()) score += 1;
    if (website.trim()) score += 1;
    if (phone.trim()) score += 1;
    
    // Score Classification
    let leadScore = 'LOW';
    if (score >= 7) {
      leadScore = 'HIGH';
    } else if (score >= 4) {
      leadScore = 'MEDIUM';
    }

    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      name.trim(),
      company.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      country.trim(),
      website.trim(),
      service.trim(),
      budget.trim(),
      timeline.trim(),
      leadScore
    ];

    // Config presence
    const sheetConfigured = !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_SHEET_ID);
    const emailConfigured = !!(process.env.GMAIL_USER && process.env.GMAIL_PASS);

    // 1. Google Sheets upload
    let sheetSucceeded = false;
    if (sheetConfigured) {
      sheetSucceeded = await sheetsService.appendToSheet(row, 'Leads');
    }

    // 2. Email alert
    let emailSucceeded = false;
    if (emailConfigured) {
      const subject = `🎯 New Chatbot Lead — ${name.trim()}${company.trim() ? ` (${company.trim()})` : ''} [${leadScore} Score]`;

      const textBody = [
        '╔══════════════════════════════════════════╗',
        '║   NEW LEAD — HAUS OF DADA CHATBOT        ║',
        '╚══════════════════════════════════════════╝',
        '',
        `Lead Score:   [${leadScore}]`,
        '',
        '── CONTACT DETAILS ──────────────────────────',
        `Name:     ${name.trim()    || '—'}`,
        `Company:  ${company.trim() || '—'}`,
        `Email:    ${email.trim()   || '—'}`,
        `Phone:    ${phone.trim()   || '—'}`,
        `Country:  ${country.trim() || '—'}`,
        `Website:  ${website.trim() || '—'}`,
        '',
        '── PROJECT DETAILS ──────────────────────────',
        `Service:  ${service.trim()  || '—'}`,
        `Budget:   ${budget.trim()   || '—'}`,
        `Timeline: ${timeline.trim() || '—'}`,
        '',
        '─────────────────────────────────────────────',
        `Captured via: Haus of DADA AI Chatbot`,
        `Timestamp:    ${timestamp}`,
      ].join('\n');

      // Clean and sanitize inputs for the HTML email body
      const escapedName = escapeHtml(name.trim());
      const escapedCompany = escapeHtml(company.trim());
      const escapedEmail = escapeHtml(email.trim());
      const escapedPhone = escapeHtml(phone.trim());
      const escapedCountry = escapeHtml(country.trim());
      
      let safeWebsite = website.trim();
      if (safeWebsite && !/^https?:\/\//i.test(safeWebsite)) {
        safeWebsite = 'https://' + safeWebsite;
      }
      const escapedWebsite = escapeHtml(safeWebsite);
      
      const escapedService = escapeHtml(service.trim());
      const escapedBudget = escapeHtml(budget.trim());
      const escapedTimeline = escapeHtml(timeline.trim());

      const htmlBody = `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0d0d0d; color: #f0f0f0; padding: 32px; border-radius: 12px;">
          <div style="background: #FF4200; color: #fff; padding: 4px 12px; border-radius: 4px; display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px;">🎯 New Lead</div>
          
          <div style="float: right; font-weight: bold; background: ${leadScore === 'HIGH' ? '#FF4200' : leadScore === 'MEDIUM' ? '#FFA500' : '#444'}; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">Score: ${leadScore}</div>
          
          <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 4px; color: #fff;">${escapedName}</h1>
          ${escapedCompany ? `<p style="color: #999; margin: 0 0 28px;">${escapedCompany}</p>` : '<br>'}

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #222; color: #888; font-size: 13px; width: 110px;">Email</td><td style="padding: 10px 0; border-bottom: 1px solid #222;"><a href="mailto:${escapedEmail}" style="color: #FF4200;">${escapedEmail}</a></td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #222; color: #888; font-size: 13px;">Phone</td><td style="padding: 10px 0; border-bottom: 1px solid #222;">${escapedPhone || '—'}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #222; color: #888; font-size: 13px;">Country</td><td style="padding: 10px 0; border-bottom: 1px solid #222;">${escapedCountry || '—'}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #222; color: #888; font-size: 13px;">Website</td><td style="padding: 10px 0; border-bottom: 1px solid #222;">${escapedWebsite ? `<a href="${escapedWebsite}" style="color: #FF4200;">${escapedWebsite}</a>` : '—'}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #222; color: #888; font-size: 13px;">Service</td><td style="padding: 10px 0; border-bottom: 1px solid #222;">${escapedService || '—'}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #222; color: #888; font-size: 13px;">Budget</td><td style="padding: 10px 0; border-bottom: 1px solid #222;">${escapedBudget || '—'}</td></tr>
            <tr><td style="padding: 10px 0; border-bottom: 1px solid #222; color: #888; font-size: 13px;">Timeline</td><td style="padding: 10px 0;">${escapedTimeline || '—'}</td></tr>
          </table>

          <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #666;">
            Captured via <strong style="color: #FF4200;">Haus of DADA AI Chatbot</strong> · ${timestamp}
          </div>
        </div>
      `;

      emailSucceeded = await emailService.sendEmailNotification(subject, textBody, htmlBody, email.trim());
    }

    // Check complete failure
    const attempts = [];
    if (sheetConfigured) attempts.push(sheetSucceeded);
    if (emailConfigured) attempts.push(emailSucceeded);

    const hasSuccess = attempts.length === 0 || attempts.some(s => s);
    if (!hasSuccess) {
      logError('LEAD_ERROR', 'Lead submission failed completely: sheets and email failed', new Error('Dual failure'));
      return res.status(500).json({ success: false, error: 'Failed to save lead information.' });
    }

    logEvent('LEAD_SUCCESS', 'Lead processed successfully', { sheetSucceeded, emailSucceeded });
    return res.status(200).json({ success: true, leadScore });
  } catch (err) {
    logError('UNEXPECTED_ERROR', 'Unexpected error in lead handler', err);
    return res.status(500).json({ success: false, error: 'An unexpected error occurred. Please try again later.' });
  }
};
