import { trackEvent } from '../utils/analytics.js';

export function renderSuggestions(container, language, onSelect) {
  const lang = language || 'de';
  
  const translations = {
    de: [
      { label: 'Branding & Identität', value: 'Erzählen Sie mir mehr über Ihre Branding & Identitäts-Leistungen' },
      { label: 'Webdesign & Webentwicklung', value: 'Erzählen Sie mir mehr über Ihre Webentwicklung & Webdesign' },
      { label: 'UI/UX-Design', value: 'Erzählen Sie mir mehr über Ihren UI/UX-Designprozess' },
      { label: 'Kommerzielle Produktion', value: 'Was ist in der kommerziellen Produktion enthalten?' }
    ],
    en: [
      { label: 'Branding & Identity', value: 'Tell me about your Branding & Identity services' },
      { label: 'Web Design & Dev', value: 'Tell me about your Web Design & Development' },
      { label: 'UI/UX Design', value: 'Tell me about your UI/UX design process' },
      { label: 'Commercial Production', value: 'What is included in Commercial Production?' }
    ],
    fr: [
      { label: 'Branding & Identité', value: 'Parlez-moi de vos services de branding et d\'identité' },
      { label: 'Design & Dév Web', value: 'Parlez-moi de votre développement et design web' },
      { label: 'Design UI/UX', value: 'Parlez-moi de votre processus de design UI/UX' },
      { label: 'Production Commerciale', value: 'Qu\'est-ce qui est inclus dans la production commerciale ?' }
    ]
  };

  const suggestions = translations[lang] || translations.de;

  const wrapper = document.createElement('div');
  wrapper.className = 'dada-suggestions-wrapper';
  
  suggestions.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'dada-suggestion-chip';
    btn.textContent = item.label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Disable all suggestion buttons inside the wrapper to prevent double clicks
      wrapper.querySelectorAll('.dada-suggestion-chip').forEach(function(chip) {
        chip.disabled = true;
      });

      trackEvent('SERVICE_INTEREST', lang, item.label);
      onSelect(item.value);
      wrapper.remove();
    });
    wrapper.appendChild(btn);
  });
  
  container.appendChild(wrapper);
}
