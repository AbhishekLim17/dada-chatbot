export function detectLanguage(text) {
  if (!text) return 'de'; // Default to German
  const clean = text.toLowerCase().trim();
  
  const enPatterns = ['hello', 'hi', 'hey', 'how', 'what', 'branding', 'website', 'marketing', 'agency', 'cost', 'price', 'startup'];
  const frPatterns = ['bonjour', 'salut', 'comment', 'agence', 'prix', 'combien', 'site', 'identite'];
  
  let enCount = 0;
  let frCount = 0;
  
  enPatterns.forEach(p => { if (clean.includes(p)) enCount++; });
  frPatterns.forEach(p => { if (clean.includes(p)) frCount++; });
  
  if (frCount > enCount) return 'fr';
  if (enCount > 0) return 'en';
  return 'de';
}

const GREETINGS = {
  de: 'Hey! 👋 Ich bin DADA, Ihr Begleiter für alles rund um die Haus of DADA. Egal, ob Sie eine starke Marke aufbauen, eine beeindruckende Website launchen oder kinoreife Inhalte erstellen wollen – ich bin für Sie da. Was führt Sie heute zu uns?',
  en: 'Hey! 👋 I\'m DADA, your guide to everything Haus of DADA. Whether you\'re looking to build a bold brand, launch a stunning website, or create cinematic content — I\'m here to help. What brings you here today?',
  fr: 'Bonjour ! 👋 Je suis DADA, votre guide pour tout ce qui concerne Haus of DADA. Que vous souhaitiez créer une marque forte, lancer un site web exceptionnel ou produire du contenu cinématographique, je suis là pour vous aider. Qu\'est-ce qui vous amène aujourd\'hui ?'
};

export function getGreeting(lang) {
  return GREETINGS[lang] || GREETINGS.de;
}

const UI_TRANSLATIONS = {
  de: {
    trigger_aria: 'Mit DADA chatten — Haus of DADA KI-Assistent',
    trigger_label: 'Mit DADA chatten',
    panel_aria: 'Haus of DADA Chat-Assistent',
    reset_aria: 'Unterhaltung zurücksetzen',
    close_aria: 'Chat schließen',
    input_placeholder: 'Wie können wir helfen?',
    input_aria: 'Nachricht',
    send_aria: 'Nachricht senden',
    badge_aria: 'Neue Nachricht',
    
    // Lead Form
    lead_title: 'Lassen Sie uns Kontakt aufnehmen',
    lead_subtitle: 'Teilen Sie uns ein paar Details mit, und unser Team meldet sich bei Ihnen.',
    lead_name: 'Name *',
    lead_name_placeholder: 'Ihr Name',
    lead_company: 'Unternehmen',
    lead_company_placeholder: 'Firma GmbH',
    lead_email: 'E-Mail-Adresse *',
    lead_email_placeholder: 'sie@unternehmen.com',
    lead_phone: 'Telefon',
    lead_phone_placeholder: '+49 170 …',
    lead_country: 'Land',
    lead_country_placeholder: 'Deutschland',
    lead_website: 'Website',
    lead_website_placeholder: 'https://…',
    lead_service: 'Gewünschte Leistung',
    lead_service_placeholder: 'Leistung auswählen…',
    lead_budget: 'Budgetrahmen',
    lead_budget_placeholder: 'Budgetrahmen auswählen…',
    lead_timeline: 'Zeitrahmen',
    lead_timeline_placeholder: 'Zeitrahmen auswählen…',
    lead_submit: 'An das Team senden →',
    lead_submitting: 'Wird gesendet…',
    lead_retry: 'Erneut versuchen →',
    lead_privacy: 'Mit dem Absenden erklären Sie sich mit unserer <a href="/privacy" target="_blank" style="color: var(--dada-accent); text-decoration: none;">Datenschutzerklärung</a> einverstanden. Kein Spam, versprochen.',
    lead_success_text: function(name) {
      return 'Vielen Dank, ' + name + '! 🎉 Ihre Daten wurden an unser Team übermittelt. Wir werden uns innerhalb der nächsten 24 Stunden bei Ihnen melden. In der Zwischenzeit können Sie gerne unsere Arbeiten auf hausofdada.de ansehen.';
    },
    
    // Error states
    lang_changed: 'Sprache wurde auf Deutsch umgestellt. Sie können das Gespräch wie gewohnt fortsetzen.',
    err_trouble: 'Ich habe gerade Schwierigkeiten zu antworten. Bitte versuchen Sie es gleich noch einmal.',
    err_timeout: 'Das dauert länger als erwartet.',
    err_offline: 'Bitte überprüfen Sie Ihre Internetverbindung.',
    
    // Select option labels
    budgets: {
      under1k: 'Unter 1.000 €',
      under5k: '1.000 € – 5.000 €',
      under15k: '5.000 € – 15.000 €',
      over15k: '15.000 €+',
      notSure: 'Noch unsicher'
    },
    timelines: {
      asap: 'Schnellstmöglich',
      oneMonth: 'Innerhalb von 1 Monat',
      oneToThree: '1–3 Monate',
      threeToSix: '3–6 Monate',
      sixPlus: '6+ Monate',
      flexible: 'Flexibel'
    },
    services: {
      branding: 'Branding & Identität',
      webdev: 'Webdesign & Webentwicklung',
      uiux: 'UI/UX & Produktdesign',
      production: 'Kommerzielle Produktion',
      motion: 'Motion Graphics & Animation',
      marketing: 'Digitales Marketing & Strategie',
      fullPackage: 'Full Studio Paket',
      notSure: 'Noch nicht sicher'
    }
  },
  en: {
    trigger_aria: 'Chat with DADA — Haus of DADA AI assistant',
    trigger_label: 'Chat with DADA',
    panel_aria: 'Haus of DADA chat assistant',
    reset_aria: 'Reset Conversation',
    close_aria: 'Close chat',
    input_placeholder: 'How can we help?',
    input_aria: 'Message',
    send_aria: 'Send message',
    badge_aria: 'New message',
    
    // Lead Form
    lead_title: 'Let\'s get in touch',
    lead_subtitle: 'Share a few details and our team will get back to you personally.',
    lead_name: 'Name *',
    lead_name_placeholder: 'Your name',
    lead_company: 'Company',
    lead_company_placeholder: 'Company LLC',
    lead_email: 'Email Address *',
    lead_email_placeholder: 'you@company.com',
    lead_phone: 'Phone',
    lead_phone_placeholder: '+1 …',
    lead_country: 'Country',
    lead_country_placeholder: 'Germany',
    lead_website: 'Website',
    lead_website_placeholder: 'https://…',
    lead_service: 'Desired Service',
    lead_service_placeholder: 'Select a service…',
    lead_budget: 'Budget Range',
    lead_budget_placeholder: 'Select budget range…',
    lead_timeline: 'Project Timeline',
    lead_timeline_placeholder: 'Select timeline…',
    lead_submit: 'Send to Team →',
    lead_submitting: 'Sending…',
    lead_retry: 'Try Again →',
    lead_privacy: 'By submitting, you agree to our <a href="/privacy" target="_blank" style="color: var(--dada-accent); text-decoration: none;">Privacy Policy</a>. No spam, promised.',
    lead_success_text: function(name) {
      return 'Thank you, ' + name + '! 🎉 Your details have been sent to our team. We\'ll be in touch within 24 hours. In the meantime, feel free to explore our work at hausofdada.de';
    },
    
    lang_changed: 'Language changed to English. You can continue the conversation as usual.',
    
    // Error states
    err_trouble: 'I\'m having trouble responding right now. Please try again.',
    err_timeout: 'This is taking longer than expected.',
    err_offline: 'Check your internet connection.',
    
    // Select option labels
    budgets: {
      under1k: 'Under €1,000',
      under5k: '€1,000 – €5,000',
      under15k: '€5,000 – €15,000',
      over15k: '€15,000+',
      notSure: 'Not sure yet'
    },
    timelines: {
      asap: 'ASAP',
      oneMonth: 'Within 1 month',
      oneToThree: '1–3 months',
      threeToSix: '3–6 months',
      sixPlus: '6+ months',
      flexible: 'Flexible'
    },
    services: {
      branding: 'Branding & Identity',
      webdev: 'Web Design & Development',
      uiux: 'UI/UX & Product Design',
      production: 'Commercial Production',
      motion: 'Motion Graphics & Animation',
      marketing: 'Digital Marketing & Strategy',
      fullPackage: 'Full Studio Package',
      notSure: 'Not sure yet'
    }
  },
  fr: {
    trigger_aria: 'Discuter avec DADA — Haus of DADA Assistant IA',
    trigger_label: 'Discuter avec DADA',
    panel_aria: 'Haus of DADA Assistant de discussion',
    reset_aria: 'Réinitialiser la conversation',
    close_aria: 'Fermer la discussion',
    input_placeholder: 'Comment pouvons-nous vous aider ?',
    input_aria: 'Message',
    send_aria: 'Envoyer le message',
    badge_aria: 'Nouveau message',
    
    // Lead Form
    lead_title: 'Contactez-nous',
    lead_subtitle: 'Partagez quelques détails et notre équipe vous contactera personnellement.',
    lead_name: 'Nom *',
    lead_name_placeholder: 'Votre nom',
    lead_company: 'Entreprise',
    lead_company_placeholder: 'Entreprise SAS',
    lead_email: 'Adresse e-mail *',
    lead_email_placeholder: 'vous@entreprise.com',
    lead_phone: 'Téléphone',
    lead_phone_placeholder: '+33 …',
    lead_country: 'Pays',
    lead_country_placeholder: 'France',
    lead_website: 'Site Web',
    lead_website_placeholder: 'https://…',
    lead_service: 'Service Souhaité',
    lead_service_placeholder: 'Sélectionnez un service…',
    lead_budget: 'Budget Estimé',
    lead_budget_placeholder: 'Sélectionnez un budget…',
    lead_timeline: 'Délai du Projet',
    lead_timeline_placeholder: 'Sélectionnez un délai…',
    lead_submit: 'Envoyer à l\'équipe →',
    lead_submitting: 'Envoi en cours…',
    lead_retry: 'Réessayer →',
    lead_privacy: 'En soumettant ce formulaire, vous acceptez notre <a href="/privacy" target="_blank" style="color: var(--dada-accent); text-decoration: none;">Politique de confidentialité</a>. Pas de spam, c\'est promis.',
    lead_success_text: function(name) {
      return 'Merci, ' + name + ' ! 🎉 Vos coordonnées ont été transmises à notre équipe. Nous vous contacterons dans les 24 heures. En attendant, n\'hésitez pas à explorer nos réalisations sur hausofdada.de';
    },
    
    lang_changed: 'Langue changée en Français. Vous pouvez poursuivre la conversation normalement.',
    
    // Error states
    err_trouble: 'J\'ai du mal à répondre pour le moment. Veuillez réessayer dans un instant.',
    err_timeout: 'Cela prend plus de temps que prévu.',
    err_offline: 'Veuillez vérifier votre connexion Internet.',
    
    // Select option labels
    budgets: {
      under1k: 'Moins de 1 000 €',
      under5k: '1 000 € – 5 000 €',
      under15k: '5 000 € – 15 000 €',
      over15k: '15 000 €+',
      notSure: 'Pas encore sûr'
    },
    timelines: {
      asap: 'ASAP',
      oneMonth: 'Dans le mois',
      oneToThree: '1 à 3 mois',
      threeToSix: '3 à 6 mois',
      sixPlus: '6 mois et plus',
      flexible: 'Flexible'
    },
    services: {
      branding: 'Branding & Identité',
      webdev: 'Design & Développement Web',
      uiux: 'Design UI/UX & Produit',
      production: 'Production Commerciale',
      motion: 'Motion Graphics & Animation',
      marketing: 'Marketing Digital & Stratégie',
      fullPackage: 'Pack Studio Complet',
      notSure: 'Pas encore sûr'
    }
  }
};

export function getUITranslation(key, lang) {
  const dictionary = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.de;
  return dictionary[key] || '';
}
