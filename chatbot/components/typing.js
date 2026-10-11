export function appendTypingIndicator(container) {
  var el = document.createElement('div');
  el.className = 'dada-typing';
  el.innerHTML =
    '<div class="dada-msg__avatar">D</div>' +
    '<div class="dada-typing__dots">' +
      '<span class="dada-typing__dot"></span>' +
      '<span class="dada-typing__dot"></span>' +
      '<span class="dada-typing__dot"></span>' +
    '</div>';
  container.appendChild(el);
  return el;
}
