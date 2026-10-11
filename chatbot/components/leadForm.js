import { CONFIG } from '../constants/config.js';
import { escapeHtml } from '../utils/markdown.js';
import { trackEvent } from '../utils/analytics.js';
import { getUITranslation } from '../utils/language.js';

export function appendLeadForm(container, language, onSubmitSuccess) {
  var lang = language || 'de';
  var form = document.createElement('div');
  form.className = 'dada-lead-form';
  form.id = 'dada-lead-form';
  form.setAttribute('role', 'form');
  form.setAttribute('aria-label', getUITranslation('lead_title', lang));

  var budgets = getUITranslation('budgets', lang) || {};
  var timelines = getUITranslation('timelines', lang) || {};
  var services = getUITranslation('services', lang) || {};

  form.innerHTML = '\
<div class="dada-lead-form__title">' + escapeHtml(getUITranslation('lead_title', lang)) + '</div>\
<div class="dada-lead-form__subtitle">' + escapeHtml(getUITranslation('lead_subtitle', lang)) + '</div>\
<div class="dada-lead-form__grid">\
  <div class="dada-field" style="display:none !important; position:absolute; width:0; height:0; opacity:0; z-index:-1; overflow:hidden;">\
    <label for="dada-companyFax">Company Fax</label>\
    <input type="text" id="dada-companyFax" tabindex="-1" autocomplete="off">\
  </div>\
  <div class="dada-field">\
    <label for="dada-name">' + escapeHtml(getUITranslation('lead_name', lang)) + '</label>\
    <input type="text" id="dada-name" placeholder="' + escapeHtml(getUITranslation('lead_name_placeholder', lang)) + '" autocomplete="name" required>\
  </div>\
  <div class="dada-field">\
    <label for="dada-company">' + escapeHtml(getUITranslation('lead_company', lang)) + '</label>\
    <input type="text" id="dada-company" placeholder="' + escapeHtml(getUITranslation('lead_company_placeholder', lang)) + '" autocomplete="organization">\
  </div>\
  <div class="dada-field">\
    <label for="dada-email">' + escapeHtml(getUITranslation('lead_email', lang)) + '</label>\
    <input type="email" id="dada-email" placeholder="' + escapeHtml(getUITranslation('lead_email_placeholder', lang)) + '" autocomplete="email" required>\
  </div>\
  <div class="dada-field">\
    <label for="dada-phone">' + escapeHtml(getUITranslation('lead_phone', lang)) + '</label>\
    <input type="tel" id="dada-phone" placeholder="' + escapeHtml(getUITranslation('lead_phone_placeholder', lang)) + '" autocomplete="tel">\
  </div>\
  <div class="dada-field">\
    <label for="dada-country">' + escapeHtml(getUITranslation('lead_country', lang)) + '</label>\
    <input type="text" id="dada-country" placeholder="' + escapeHtml(getUITranslation('lead_country_placeholder', lang)) + '" autocomplete="country-name">\
  </div>\
  <div class="dada-field">\
    <label for="dada-website">' + escapeHtml(getUITranslation('lead_website', lang)) + '</label>\
    <input type="url" id="dada-website" placeholder="' + escapeHtml(getUITranslation('lead_website_placeholder', lang)) + '">\
  </div>\
  <div class="dada-field dada-field--full">\
    <label for="dada-service">' + escapeHtml(getUITranslation('lead_service', lang)) + '</label>\
    <select id="dada-service">\
      <option value="">' + escapeHtml(getUITranslation('lead_service_placeholder', lang)) + '</option>\
      <option value="Branding & Identity">' + escapeHtml(services.branding || 'Branding & Identity') + '</option>\
      <option value="UI/UX & Product Design">' + escapeHtml(services.uiux || 'UI/UX & Product Design') + '</option>\
      <option value="Web Design & Development">' + escapeHtml(services.webdev || 'Web Design & Development') + '</option>\
      <option value="Commercial Production">' + escapeHtml(services.production || 'Commercial Production') + '</option>\
      <option value="Motion Graphics & Animation">' + escapeHtml(services.motion || 'Motion Graphics & Animation') + '</option>\
      <option value="Digital Marketing & Strategy">' + escapeHtml(services.marketing || 'Digital Marketing & Strategy') + '</option>\
      <option value="Full Studio Package">' + escapeHtml(services.fullPackage || 'Full Studio Package') + '</option>\
      <option value="Not sure yet">' + escapeHtml(services.notSure || 'Not sure yet') + '</option>\
    </select>\
  </div>\
  <div class="dada-field">\
    <label for="dada-budget">' + escapeHtml(getUITranslation('lead_budget', lang)) + '</label>\
    <select id="dada-budget">\
      <option value="">' + escapeHtml(getUITranslation('lead_budget_placeholder', lang)) + '</option>\
      <option value="Under €1,000">' + escapeHtml(budgets.under1k || 'Under €1,000') + '</option>\
      <option value="€1,000 – €5,000">' + escapeHtml(budgets.under5k || '€1,000 – €5,000') + '</option>\
      <option value="€5,000 – €15,000">' + escapeHtml(budgets.under15k || '€5,000 – €15,000') + '</option>\
      <option value="€15,000+">' + escapeHtml(budgets.over15k || '€15,000+') + '</option>\
      <option value="Not sure yet">' + escapeHtml(budgets.notSure || 'Not sure yet') + '</option>\
    </select>\
  </div>\
  <div class="dada-field">\
    <label for="dada-timeline">' + escapeHtml(getUITranslation('lead_timeline', lang)) + '</label>\
    <select id="dada-timeline">\
      <option value="">' + escapeHtml(getUITranslation('lead_timeline_placeholder', lang)) + '</option>\
      <option value="ASAP">' + escapeHtml(timelines.asap || 'ASAP') + '</option>\
      <option value="Within 1 month">' + escapeHtml(timelines.oneMonth || 'Within 1 month') + '</option>\
      <option value="1–3 months">' + escapeHtml(timelines.oneToThree || '1–3 months') + '</option>\
      <option value="3–6 months">' + escapeHtml(timelines.threeToSix || '3–6 months') + '</option>\
      <option value="6+ months">' + escapeHtml(timelines.sixPlus || '6+ months') + '</option>\
      <option value="Flexible">' + escapeHtml(timelines.flexible || 'Flexible') + '</option>\
    </select>\
  </div>\
</div>\
<button class="dada-lead-form__submit" id="dada-lead-submit" type="button">' + escapeHtml(getUITranslation('lead_submit', lang)) + '</button>\
<p class="dada-lead-form__privacy">' + getUITranslation('lead_privacy', lang) + '</p>';

  container.appendChild(form);

  // C4 Fix: Scope event binding to the form element, not document, to prevent
  // global ID collisions if ever called more than once.
  var submitBtn = form.querySelector('.dada-lead-form__submit');

  submitBtn.addEventListener('click', function () {
    var nameEl  = form.querySelector('#dada-name');
    var emailEl = form.querySelector('#dada-email');

    var valid = true;

    // Validate name
    if (!nameEl.value.trim()) {
      nameEl.parentElement.classList.add('dada-field--error');
      valid = false;
    } else {
      nameEl.parentElement.classList.remove('dada-field--error');
    }

    // B4 Fix: Validate email presence AND format before submitting
    var emailVal = emailEl.value.trim();
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      emailEl.parentElement.classList.add('dada-field--error');
      valid = false;
    } else {
      emailEl.parentElement.classList.remove('dada-field--error');
    }

    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="dada-spinner"></span> ' + escapeHtml(getUITranslation('lead_submitting', lang));

    var payload = {
      name:       nameEl.value.trim(),
      company:    (form.querySelector('#dada-company')   || {}).value || '',
      email:      emailEl.value.trim(),
      phone:      (form.querySelector('#dada-phone')     || {}).value || '',
      country:    (form.querySelector('#dada-country')   || {}).value || '',
      website:    (form.querySelector('#dada-website')   || {}).value || '',
      service:    (form.querySelector('#dada-service')   || {}).value || '',
      budget:     (form.querySelector('#dada-budget')    || {}).value || '',
      timeline:   (form.querySelector('#dada-timeline')  || {}).value || '',
      companyFax: (form.querySelector('#dada-companyFax') || {}).value || '',
    };

    fetch(CONFIG.API_LEAD, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      if (data.success) {
        // C6 Fix: Immediately clear the "form shown" key so a crash-restored
        // session cannot re-render the form and trigger a duplicate submission.
        try { sessionStorage.removeItem('dada_lead_form_shown'); } catch (e) {}
        trackEvent('LEAD_SUBMITTED', lang, payload.service, data.leadScore || 'LOW', payload.country);
        onSubmitSuccess(payload.name);
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = getUITranslation('lead_retry', lang) || 'Try Again →';
      }
    })
    .catch(function (err) {
      console.warn('[LeadForm] Submission failed:', err);
      submitBtn.disabled = false;
      submitBtn.textContent = getUITranslation('lead_retry', lang) || 'Try Again →';
    });
  });
}
