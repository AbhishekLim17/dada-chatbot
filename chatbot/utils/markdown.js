export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function parseMarkdown(text) {
  if (!text) return '';
  
  var escaped = escapeHtml(text);
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Safe link parsing ([text](url)) - allows http/https and relative paths, escaping double quotes
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(match, textVal, urlVal) {
    const cleanUrl = urlVal.trim();
    if (/^(https?:\/\/|\/)/i.test(cleanUrl)) {
      const safeUrl = cleanUrl.replace(/"/g, '&quot;');
      return '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer" style="color: var(--dada-accent); text-decoration: underline;">' + textVal + '</a>';
    }
    return textVal;
  });
  
  var lines = escaped.split('\n');
  var inList = false;
  var listType = '';
  var resultLines = [];
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    var isBullet   = line.indexOf('- ') === 0 || line.indexOf('* ') === 0;
    var isNumbered = /^\d+\.\s/.test(line);

    if (isBullet || isNumbered) {
      var newType = isBullet ? 'ul' : 'ol';
      var itemContent = isBullet ? line.substring(2).trim() : line.replace(/^\d+\.\s/, '').trim();

      if (inList && listType !== newType) {
        resultLines.push('</' + listType + '>');
        inList = false;
      }

      if (!inList) {
        resultLines.push('<' + newType + ' class="dada-msg__list">');
        inList = true;
        listType = newType;
      }
      resultLines.push('<li>' + itemContent + '</li>');
    } else {
      if (inList) {
        resultLines.push('</' + listType + '>');
        inList = false;
        listType = '';
      }
      resultLines.push(line);
    }
  }
  if (inList) {
    resultLines.push('</' + listType + '>');
  }
  
  var html = '';
  for (var j = 0; j < resultLines.length; j++) {
    var curr = resultLines[j];
    var next = resultLines[j + 1] || '';
    
    html += curr;
    
    if (!curr.match(/^<(ul|ol) class="dada-msg__list">$/) &&
        !curr.match(/^<\/(ul|ol)>$/) &&
        !curr.match(/^<li>.*<\/li>$/) &&
        !next.match(/^<(ul|ol) class="dada-msg__list">$/) &&
        !next.match(/^<\/(ul|ol)>$/) &&
        !next.match(/^<li>.*<\/li>$/) &&
        j < resultLines.length - 1) {
      html += '<br>';
    }
  }
  
  return html;
}
