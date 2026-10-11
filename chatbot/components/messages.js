import { escapeHtml, parseMarkdown } from '../utils/markdown.js';

function getFormattedTime() {
  var now = new Date();
  var hh = String(now.getHours()).padStart(2, '0');
  var mm = String(now.getMinutes()).padStart(2, '0');
  return hh + ':' + mm;
}

function shouldHideAvatar(container) {
  var last = container.lastElementChild;
  while (last && (
    last.className.indexOf('dada-suggestions-wrapper') !== -1 || 
    last.className.indexOf('dada-typing') !== -1 ||
    last.id === 'dada-lead-form'
  )) {
    last = last.previousElementSibling;
  }
  return last && last.classList.contains('dada-msg--bot');
}

export function initMessages(container) {
  container.innerHTML = '';
}

export function appendBotMessage(container, text, timestamp) {
  var time = timestamp || getFormattedTime();
  var hideAvatar = shouldHideAvatar(container);
  var msg = document.createElement('div');
  msg.className = 'dada-msg dada-msg--bot' + (hideAvatar ? ' dada-msg--no-avatar' : '');
  msg.innerHTML =
    '<div class="dada-msg__avatar">D</div>' +
    '<div class="dada-msg__bubble">' + parseMarkdown(text) + '</div>' +
    '<span class="dada-msg__timestamp">' + time + '</span>';
  container.appendChild(msg);
  return msg;
}

export function appendUserMessage(container, text, timestamp) {
  var time = timestamp || getFormattedTime();
  var msg = document.createElement('div');
  msg.className = 'dada-msg dada-msg--user';
  msg.innerHTML =
    '<div class="dada-msg__avatar">' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">' +
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>' +
    '<circle cx="12" cy="7" r="4"></circle>' +
    '</svg>' +
    '</div>' +
    '<div class="dada-msg__bubble">' + escapeHtml(text).replace(/\n/g, '<br>') + '</div>' +
    '<span class="dada-msg__timestamp">' + time + '</span>';
  container.appendChild(msg);
  return msg;
}

export function appendBotMessageStreaming(container, text, timestamp, onComplete) {
  var time = timestamp || getFormattedTime();
  var hideAvatar = shouldHideAvatar(container);
  var msg = document.createElement('div');
  msg.className = 'dada-msg dada-msg--bot' + (hideAvatar ? ' dada-msg--no-avatar' : '');
  msg.innerHTML =
    '<div class="dada-msg__avatar">D</div>' +
    '<div class="dada-msg__bubble"></div>' +
    '<span class="dada-msg__timestamp">' + time + '</span>';
  container.appendChild(msg);

  var bubble = msg.querySelector('.dada-msg__bubble');
  var words = text.split(/(\s+)/);
  var index = 0;
  var currentText = '';

  var interval = setInterval(function () {
    if (index >= words.length) {
      clearInterval(interval);
      if (typeof onComplete === 'function') {
        onComplete(msg);
      }
      return;
    }

    // Check if the scroll position is near the bottom (with a threshold of 40px)
    // before rendering the new text. This prevents scroll hijacking when a user scrolls up.
    var threshold = 40;
    var isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;

    currentText += words[index];
    bubble.innerHTML = parseMarkdown(currentText);
    index++;

    if (isAtBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, 25);

  // Return a cancellation interface to prevent race conditions on reset or new streams
  return {
    msg: msg,
    cancel: function () {
      clearInterval(interval);
    }
  };
}
