import { CONFIG } from './constants/config.js';
import { loadSession, saveSession } from './storage/session.js';
import { detectLanguage, getGreeting, getUITranslation } from './utils/language.js';
import { escapeHtml } from './utils/markdown.js';
import { trackEvent } from './utils/analytics.js';
import { initMessages, appendBotMessage, appendUserMessage, appendBotMessageStreaming } from './components/messages.js';
import { appendTypingIndicator } from './components/typing.js';
import { appendLeadForm } from './components/leadForm.js';
import { renderSuggestions } from './components/suggestions.js';

(function () {
  'use strict';

  /* ── State ───────────────────────────────────────────────────────────────── */
  var isOpen         = false;
  var isTyping       = false;
  var leadFormShown  = false;
  var leadSubmitted  = false;
  var history        = [];
  var language       = '';
  var abandonedTracked = false; // track CONVERSATION_ABANDONED once per session
  var currentStream  = null;    // tracks active streaming interval

  // Restore session state on load
  const session = loadSession();
  history = session.history;
  leadFormShown = session.leadFormShown;
  leadSubmitted = session.leadSubmitted;
  language = session.language;

  function getFormattedTime() {
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  }

  // Initialize Session ID and messageCount for Phase 4 Analytics
  var sessionId = '';
  try {
    sessionId = sessionStorage.getItem('dada_chat_session_id') || '';
    if (!sessionId) {
      sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      sessionStorage.setItem('dada_chat_session_id', sessionId);
    }
  } catch (e) {
    // Generate valid UUID in-memory fallback to satisfy validate rules on backend
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  var messageCount = 0;
  try {
    messageCount = parseInt(sessionStorage.getItem('dada_chat_message_count') || '0', 10);
  } catch (e) {}

  /* ── DOM refs ────────────────────────────────────────────────────────────── */
  var elWidget, elTrigger, elPanel, elMessages, elInput, elSend, elBadge;

  /* ── SVG icons ───────────────────────────────────────────────────────────── */
  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
  var ICON_BOT  = 'D';

  /* ── Widget HTML ─────────────────────────────────────────────────────────── */
  function buildWidgetHTML() {
    return '\
<div id="dada-chat-widget">\
  <button class="dada-trigger" id="dada-trigger" aria-label="Chat with DADA — Haus of DADA AI assistant" aria-expanded="false">\
    <span class="dada-trigger__icon">' + ICON_CHAT + '</span>\
    <span class="dada-trigger__label">Chat with DADA</span>\
  </button>\
  <div class="dada-panel" id="dada-panel" role="dialog" aria-modal="true" aria-label="Haus of DADA chat assistant" aria-hidden="true">\
    <div class="dada-header">\
      <div class="dada-header__info">\
        <div class="dada-header__avatar">' + ICON_BOT + '</div>\
        <div class="dada-header__name-wrap">\
          <span class="dada-header__name">DADA Assistant</span>\
          <span class="dada-header__status">Online</span>\
        </div>\
      </div>\
      <div class="dada-header__actions">\
        <button class="dada-reset" id="dada-reset" aria-label="Reset Conversation">↺</button>\
        <button class="dada-close" id="dada-close" aria-label="Close chat">✕</button>\
      </div>\
    </div>\
    <div class="dada-messages" id="dada-messages" role="log" aria-live="polite" aria-relevant="additions"></div>\
    <div class="dada-input-area">\
      <input class="dada-input" id="dada-input" type="text" placeholder="How can we help?" maxlength="500" autocomplete="off" aria-label="Message">\
      <button class="dada-send" id="dada-send" aria-label="Send message">' + ICON_SEND + '</button>\
    </div>\
  </div>\
</div>';
  }

  /* ── Dynamic UI Translations ─────────────────────────────────────────────── */
  function updateUILabels() {
    var lang = language || 'de';
    
    // Update trigger labels
    if (elTrigger) {
      elTrigger.setAttribute('aria-label', getUITranslation('trigger_aria', lang));
      var triggerLabel = elTrigger.querySelector('.dada-trigger__label');
      if (triggerLabel) {
        triggerLabel.textContent = getUITranslation('trigger_label', lang);
      }
    }
    
    // Update panel labels
    if (elPanel) {
      elPanel.setAttribute('aria-label', getUITranslation('panel_aria', lang));
    }
    
    // Update input placeholder and aria
    if (elInput) {
      elInput.setAttribute('placeholder', getUITranslation('input_placeholder', lang));
      elInput.setAttribute('aria-label', getUITranslation('input_aria', lang));
    }
    
    // Update send button label
    if (elSend) {
      elSend.setAttribute('aria-label', getUITranslation('send_aria', lang));
    }
    
    // Update close and reset tooltips
    var elClose = document.getElementById('dada-close');
    if (elClose) {
      elClose.setAttribute('aria-label', getUITranslation('close_aria', lang));
    }
    var elReset = document.getElementById('dada-reset');
    if (elReset) {
      elReset.setAttribute('aria-label', getUITranslation('reset_aria', lang));
    }
  }

  /* ── Init ────────────────────────────────────────────────────────────────── */
  function init() {
    // Inject widget HTML
    var wrapper = document.createElement('div');
    wrapper.innerHTML = buildWidgetHTML();
    document.body.appendChild(wrapper.firstElementChild);

    // Cache DOM refs
    elWidget   = document.getElementById('dada-chat-widget');
    elTrigger  = document.getElementById('dada-trigger');
    elPanel    = document.getElementById('dada-panel');
    elMessages = document.getElementById('dada-messages');
    elInput    = document.getElementById('dada-input');
    elInput.maxLength = CONFIG.MAX_MESSAGE_LENGTH;
    elSend     = document.getElementById('dada-send');

    // Apply translations initial labels
    updateUILabels();

    // Bind events
    elTrigger.addEventListener('click', openPanel);
    document.getElementById('dada-close').addEventListener('click', closePanel);
    document.getElementById('dada-reset').addEventListener('click', handleResetClick);
    elSend.addEventListener('click', handleSend);
    elInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Close panel on outside click
    document.addEventListener('click', function (e) {
      if (isOpen && !elWidget.contains(e.target)) {
        closePanel();
      }
    });

    // Global accessibility key bindings (Escape, Tab focus trapping)
    document.addEventListener('keydown', handleGlobalKeyDown);

    // Restore conversation from history
    if (history.length > 0) {
      initMessages(elMessages);
      history.forEach(function (msg) {
        if (msg.role === 'user') {
          appendUserMessage(elMessages, msg.content, msg.timestamp);
        } else {
          appendBotMessage(elMessages, msg.content, msg.timestamp);
        }
      });
      scrollToBottom(true);

      if (leadFormShown && !leadSubmitted) {
        appendLeadForm(elMessages, language, handleLeadSubmitSuccess);
      }
    }

    // Auto-greeting after delay (shows notification badge)
    setTimeout(showNotificationBadge, CONFIG.GREETING_DELAY);
  }

  /* ── Panel open/close ────────────────────────────────────────────────────── */
  function openPanel() {
    isOpen = true;
    elPanel.classList.add('dada-panel--open');
    elPanel.setAttribute('aria-hidden', 'false');
    elTrigger.setAttribute('aria-expanded', 'true');

    // Track chat open event
    trackEvent('CHAT_OPEN', language || 'de');

    // Remove badge if present
    if (elBadge) {
      elBadge.remove();
      elBadge = null;
    }

    // Translate main layout labels
    updateUILabels();

    // Show onboarding or greeting if no messages yet
    if (history.length === 0) {
      if (!language) {
        showLanguageSelection();
      } else {
        showGreeting();
      }
    }

    // Focus input on non-mobile devices
    if (shouldAutoFocus()) {
      setTimeout(function () { elInput.focus(); }, 300);
    }
  }

  function closePanel() {
    isOpen = false;
    elPanel.classList.remove('dada-panel--open');
    elPanel.setAttribute('aria-hidden', 'true');
    elTrigger.setAttribute('aria-expanded', 'false');

    // Abort active bot stream to save resources and prevent background DOM updates
    if (currentStream) {
      currentStream.cancel();
      currentStream = null;
    }
    
    // Restore focus to trigger for accessibility
    if (elTrigger) {
      elTrigger.focus();
    }

    // Track conversation abandonment if not submitted and there was an actual exchange
    if (!leadSubmitted && !abandonedTracked && history.length > 1) {
      abandonedTracked = true;
      trackEvent('CONVERSATION_ABANDONED', language);
    }
  }

  /* ── Notification badge ──────────────────────────────────────────────────── */
  function showNotificationBadge() {
    if (isOpen || history.length > 0) return;
    elBadge = document.createElement('span');
    elBadge.className = 'dada-trigger__badge';
    elBadge.setAttribute('aria-label', getUITranslation('badge_aria', language || 'de'));
    elTrigger.style.position = 'relative';
    elTrigger.appendChild(elBadge);
  }

  /* ── Language Selection Onboarding ───────────────────────────────────────── */
  function showLanguageSelection() {
    initMessages(elMessages);
    
    var chooser = document.createElement('div');
    chooser.className = 'dada-lang-chooser';
    
    var title = document.createElement('div');
    title.className = 'dada-lang-chooser__title';
    title.textContent = 'Choose your language / Sprache wählen / Choisir la langue';
    chooser.appendChild(title);
    
    var langs = [
      { code: 'en', name: 'English', flag: 'EN' },
      { code: 'de', name: 'Deutsch', flag: 'DE' },
      { code: 'fr', name: 'Français', flag: 'FR' }
    ];
    
    langs.forEach(function(lang) {
      var btn = document.createElement('button');
      btn.className = 'dada-lang-btn';
      btn.setAttribute('aria-label', 'Select ' + lang.name);
      btn.innerHTML = '<span class="dada-lang-btn__flag">' + lang.flag + '</span> <span class="dada-lang-btn__name">' + lang.name + '</span>';
      
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        language = lang.code;
        try {
          sessionStorage.setItem('dada_chat_language', language);
        } catch (err) {}
        
        // Track language detection event
        trackEvent('LANGUAGE_DETECTED', language);
        
        // Dynamically translate all control elements
        updateUILabels();

        // Clear message container and show greeting
        initMessages(elMessages);
        showGreeting();
      });
      
      chooser.appendChild(btn);
    });
    
    elMessages.appendChild(chooser);
    scrollToBottom(true);
  }

  /* ── Greeting ────────────────────────────────────────────────────────────── */
  function showGreeting() {
    initMessages(elMessages);
    
    var currentLang = language || 'de';
    var greeting = getGreeting(currentLang);
    var time = getFormattedTime();
    
    appendBotMessage(elMessages, greeting, time);
    history = [{ role: 'assistant', content: greeting, timestamp: time }];
    saveSession(history, leadFormShown, leadSubmitted, currentLang);
    
    // Render suggestion chips
    setTimeout(function() {
      // Ensure the chat is still open and greeting is visible
      if (!isOpen || history.length === 0 || history[0].content !== greeting) return;
      
      renderSuggestions(elMessages, currentLang, function(val) {
        elInput.value = val;
        handleSend();
      });
    }, 600);
  }

  /* ── Send message ────────────────────────────────────────────────────────── */
  function handleSend() {
    var text = elInput.value.trim();
    if (!text || isTyping) return;

    // Abort active streaming if user enters a new message
    if (currentStream) {
      currentStream.cancel();
      currentStream = null;
    }

    // Detect language if it's the first user input (fallback)
    if (!language) {
      language = detectLanguage(text);
      trackEvent('LANGUAGE_DETECTED', language);
      updateUILabels();
    }

    // Remove suggestion chips wrapper if present on manual send
    var sugWrapper = elMessages.querySelector('.dada-suggestions-wrapper');
    if (sugWrapper) {
      sugWrapper.remove();
    }

    // Render user bubble
    var userTime = getFormattedTime();
    appendUserMessage(elMessages, text, userTime);
    history.push({ role: 'user', content: text, timestamp: userTime });
    
    // Cap history turns at maximum of 40 turns
    while (history.length > 40) {
      history.shift();
    }
    saveSession(history, leadFormShown, leadSubmitted, language);
    
    // Increment messageCount for Phase 4 Analytics
    messageCount++;
    try {
      sessionStorage.setItem('dada_chat_message_count', String(messageCount));
    } catch (e) {}
    
    trackEvent('MESSAGE_SENT', language);

    elInput.value = '';
    setInputState(false);

    // Show typing indicator
    var typingEl = appendTypingIndicator(elMessages);
    scrollToBottom(true);
    isTyping = true;

    // Call API (strip UI attributes like timestamp before sending, limit history depth)
    var apiHistory = history.slice(-10).map(function (item) {
      return { role: item.role, content: item.content };
    });

    // Abort controller for 15s timeout
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, 15000);

    // Offline check
    if (!navigator.onLine) {
      clearTimeout(timeoutId);
      typingEl.remove();
      isTyping = false;
      setInputState(true);
      var errTime = getFormattedTime();
      appendBotMessage(elMessages, getUITranslation('err_offline', language), errTime);
      scrollToBottom(true);
      return;
    }

    fetch(CONFIG.API_CHAT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: text, history: apiHistory, language: language }),
      signal:  controller.signal
    })
    .then(function (r) {
      clearTimeout(timeoutId);
      if (!r.ok) {
        throw new Error('API_UNAVAILABLE');
      }
      return r.json();
    })
    .then(function (data) {
      typingEl.remove();

      if (data.error) {
        isTyping = false;
        setInputState(true);
        var errTime = getFormattedTime();
        appendBotMessage(elMessages, getUITranslation('err_trouble', language), errTime);
        scrollToBottom(true);
        return;
      }

      var rawReply = data.reply || '';

      // Check for lead collection trigger
      var shouldCollectLead = rawReply.indexOf(CONFIG.LEAD_TOKEN) !== -1;
      var cleanReply = rawReply.replace(CONFIG.LEAD_TOKEN, '').trim();

      var botTime = getFormattedTime();
      currentStream = appendBotMessageStreaming(elMessages, cleanReply, botTime, function() {
        currentStream = null;
        isTyping = false;
        setInputState(true);
        history.push({ role: 'assistant', content: cleanReply, timestamp: botTime });
        while (history.length > 40) {
          history.shift();
        }
        saveSession(history, leadFormShown, leadSubmitted, language);
        scrollToBottom(true);

        if (shouldCollectLead && !leadFormShown && !leadSubmitted) {
          leadFormShown = true;
          try {
            sessionStorage.setItem('dada_lead_form_shown', 'true');
          } catch (e) {}
          trackEvent('LEAD_FORM_SHOWN', language, '', 'LOW');
          setTimeout(function() {
            appendLeadForm(elMessages, language, handleLeadSubmitSuccess);
            scrollToBottom(true);
          }, 400);
        }
      });
    })
    .catch(function (err) {
      clearTimeout(timeoutId);
      typingEl.remove();
      isTyping = false;
      setInputState(true);
      var errTime = getFormattedTime();
      
      var errMsg = getUITranslation('err_trouble', language);
      if (err.name === 'AbortError') {
        errMsg = getUITranslation('err_timeout', language);
      } else if (!navigator.onLine) {
        errMsg = getUITranslation('err_offline', language);
      }
      appendBotMessage(elMessages, errMsg, errTime);
      scrollToBottom(true);
    });
  }

  function handleLeadSubmitSuccess(leadName) {
    leadSubmitted = true;
    try {
      sessionStorage.setItem('dada_lead_submitted', 'true');
    } catch (e) {}

    // Localized Success message
    var templateFn = getUITranslation('lead_success_text', language);
    var successMsg = typeof templateFn === 'function'
      ? templateFn(leadName)
      : 'Thank you, ' + leadName + '! 🎉';
      
    var time = getFormattedTime();
    appendBotMessage(elMessages, successMsg, time);
    history.push({ role: 'assistant', content: successMsg, timestamp: time });
    while (history.length > 40) {
      history.shift();
    }
    saveSession(history, leadFormShown, leadSubmitted, language);
    setInputState(true);
    scrollToBottom(true);
  }

  /* ── Conversation Reset ─────────────────────────────────────────────────── */
  function handleResetClick(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Stop active stream if resetting
    if (currentStream) {
      currentStream.cancel();
      currentStream = null;
      isTyping = false;
      setInputState(true);
    }
    
    // If the reset options are already showing, don't duplicate
    if (elMessages.querySelector('.dada-reset-options-wrapper')) {
      return;
    }

    // Append a system confirmation message
    var resetPromptText = '';
    var optNewChat = '';
    var optChangeLang = '';
    var optCancel = '';
    
    if (language === 'de') {
      resetPromptText = 'Was möchten Sie tun?';
      optNewChat = 'Neue Unterhaltung';
      optChangeLang = 'Sprache ändern';
      optCancel = 'Abbrechen';
    } else if (language === 'fr') {
      resetPromptText = 'Que voulez-vous faire ?';
      optNewChat = 'Nouvelle conversation';
      optChangeLang = 'Changer de langue';
      optCancel = 'Annuler';
    } else {
      resetPromptText = 'What would you like to do?';
      optNewChat = 'New Conversation';
      optChangeLang = 'Change Language';
      optCancel = 'Cancel';
    }

    // Append system message
    var msg = document.createElement('div');
    msg.className = 'dada-msg dada-msg--bot dada-msg--system-reset';
    msg.innerHTML =
      '<div class="dada-msg__avatar">D</div>' +
      '<div class="dada-msg__bubble"><strong>' + escapeHtml(resetPromptText) + '</strong></div>';
    elMessages.appendChild(msg);

    // Append options wrapper
    var wrapper = document.createElement('div');
    wrapper.className = 'dada-suggestions-wrapper dada-reset-options-wrapper';
    
    var options = [
      { label: optNewChat, action: 'new_chat' },
      { label: optChangeLang, action: 'change_lang' },
      { label: optCancel, action: 'cancel' }
    ];

    options.forEach(function(opt) {
      var btn = document.createElement('button');
      btn.className = 'dada-suggestion-chip';
      btn.textContent = opt.label;
      btn.addEventListener('click', function(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        
        // Remove the prompt and the chips
        msg.remove();
        wrapper.remove();

        if (opt.action === 'new_chat') {
          performReset(false); // keep language
        } else if (opt.action === 'change_lang') {
          changeLanguageInline(); // lightweight in-place language switch
        } else {
          // Cancel: just scroll to bottom
          scrollToBottom(true);
        }
      });
      wrapper.appendChild(btn);
    });

    elMessages.appendChild(wrapper);
    scrollToBottom(true);
  }

  function performReset(resetLanguage) {
    // Abort active stream
    if (currentStream) {
      currentStream.cancel();
      currentStream = null;
    }

    // Reset state
    history = [];
    leadFormShown = false;
    leadSubmitted = false;
    isTyping = false;
    
    // Clear storage keys
    sessionStorage.removeItem('dada_chat_history');
    sessionStorage.removeItem('dada_lead_form_shown');
    sessionStorage.removeItem('dada_lead_submitted');
    
    if (resetLanguage) {
      language = '';
      sessionStorage.removeItem('dada_chat_language');
    }
    
    // Clear message container
    initMessages(elMessages);
    updateUILabels(); // refresh header/footer translations
    
    if (resetLanguage || !language) {
      showLanguageSelection();
    } else {
      showGreeting();
    }
  }

  /* ── Inline Language Change (preserves history) ──────────────────────────── */
  function changeLanguageInline() {
    // Remove any existing inline language chooser to prevent duplicates
    var existing = elMessages.querySelector('.dada-lang-chooser');
    if (existing) {
      existing.remove();
    }

    // Remove any lingering suggestion chips
    var sugWrapper = elMessages.querySelector('.dada-suggestions-wrapper');
    if (sugWrapper) {
      sugWrapper.remove();
    }

    var chooser = document.createElement('div');
    chooser.className = 'dada-lang-chooser';

    var title = document.createElement('div');
    title.className = 'dada-lang-chooser__title';
    title.textContent = 'Choose your language / Sprache wählen / Choisir la langue';
    chooser.appendChild(title);

    var langs = [
      { code: 'en', name: 'English', flag: 'EN' },
      { code: 'de', name: 'Deutsch', flag: 'DE' },
      { code: 'fr', name: 'Français', flag: 'FR' }
    ];

    langs.forEach(function(lang) {
      var btn = document.createElement('button');
      btn.className = 'dada-lang-btn';
      btn.setAttribute('aria-label', 'Select ' + lang.name);
      btn.innerHTML = '<span class="dada-lang-btn__flag">' + lang.flag + '</span> <span class="dada-lang-btn__name">' + lang.name + '</span>';

      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();

        // Remove the chooser from the message stream
        chooser.remove();

        // If user picked the same language, just scroll back — no-op
        if (lang.code === language) {
          scrollToBottom(true);
          return;
        }

        // Update language state
        language = lang.code;
        try {
          sessionStorage.setItem('dada_chat_language', language);
        } catch (err) {}

        trackEvent('LANGUAGE_CHANGED', language);

        // Update all UI labels (header, placeholder, tooltips)
        updateUILabels();

        // Post a localized confirmation into the existing chat log
        var confirmMsg = getUITranslation('lang_changed', language);
        var time = getFormattedTime();
        appendBotMessage(elMessages, confirmMsg, time);
        history.push({ role: 'assistant', content: confirmMsg, timestamp: time });
        while (history.length > 40) {
          history.shift();
        }
        saveSession(history, leadFormShown, leadSubmitted, language);

        // Refresh suggestion chips in the new language
        setTimeout(function() {
          renderSuggestions(elMessages, language, function(val) {
            elInput.value = val;
            handleSend();
          });
          scrollToBottom(true);
        }, 400);

        scrollToBottom(true);
      });

      chooser.appendChild(btn);
    });

    elMessages.appendChild(chooser);
    scrollToBottom(true);
  }

  /* ── Accessibility / Keyboard ───────────────────────────────────────────── */
  function getFocusableElements(container) {
    return container.querySelectorAll('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]');
  }

  function handleGlobalKeyDown(e) {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      closePanel();
      return;
    }

    if (e.key === 'Tab') {
      var focusables = getFocusableElements(elPanel);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      // Reset focus into modal panel if user tabs from outside (focus trap protection)
      if (!elPanel.contains(document.activeElement)) {
        first.focus();
        e.preventDefault();
        return;
      }

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
  }

  function shouldAutoFocus() {
    return window.innerWidth >= 768;
  }

  /* ── Utilities ───────────────────────────────────────────────────────────── */
  function scrollToBottom(force) {
    requestAnimationFrame(function () {
      var threshold = 40; // px
      var isAtBottom = elMessages.scrollHeight - elMessages.scrollTop - elMessages.clientHeight <= threshold;
      if (force || isAtBottom) {
        elMessages.scrollTop = elMessages.scrollHeight;
      }
    });
  }

  // Exports for validation scripting support
  window.DadaChatbot = {
    performReset: performReset,
    openPanel: openPanel,
    closePanel: closePanel
  };

  function setInputState(enabled) {
    elInput.disabled = !enabled;
    elSend.disabled  = !enabled;
    if (enabled && shouldAutoFocus()) {
      elInput.focus();
    }
  }

  /* ── Bootstrap ───────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
