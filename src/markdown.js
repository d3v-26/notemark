let idCounter = 0;
function genId() {
  return `b${++idCounter}`;
}

// Parses markdown content → { title: string, blocks: Array<{id, type, content}> }
export function parseMarkdown(content, fallbackName) {
  const lines = content.split('\n');
  const blocks = [];
  let inCode = false;
  let codeContent = '';
  let title = '';
  let titleSet = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        blocks.push({ id: genId(), type: 'code', content: codeContent.trimEnd() });
        codeContent = '';
        inCode = false;
      } else {
        inCode = true;
        codeContent = '';
      }
      continue;
    }

    if (inCode) {
      codeContent += (codeContent ? '\n' : '') + line;
      continue;
    }

    if (line.trim() === '') continue;

    if (line.startsWith('# ') && !line.startsWith('## ') && !titleSet) {
      title = line.slice(2);
      titleSet = true;
    } else if (line.startsWith('### ')) {
      blocks.push({ id: genId(), type: 'h3', content: line.slice(4) });
    } else if (line.startsWith('## ')) {
      blocks.push({ id: genId(), type: 'h2', content: line.slice(3) });
    } else if (line.startsWith('# ')) {
      blocks.push({ id: genId(), type: 'h1', content: line.slice(2) });
    } else if (line.match(/^[-*] /)) {
      blocks.push({ id: genId(), type: 'ul', content: line.slice(2) });
    } else if (line.match(/^\d+\. /)) {
      blocks.push({ id: genId(), type: 'ol', content: line.replace(/^\d+\.\s/, '') });
    } else if (line.startsWith('> ')) {
      blocks.push({ id: genId(), type: 'blockquote', content: line.slice(2) });
    } else if (line.match(/^---+$/)) {
      blocks.push({ id: genId(), type: 'hr', content: '' });
    } else {
      blocks.push({ id: genId(), type: 'p', content: line });
    }
  }

  if (!titleSet) title = fallbackName || '';
  if (blocks.length === 0) blocks.push({ id: genId(), type: 'p', content: '' });

  return { title, blocks };
}

// Converts inline markdown syntax → HTML (for loading into contentEditable)
export function inlineMarkdownToHTML(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
    .replace(/_(.+?)_/gs, '<em>$1</em>')
    .replace(/==(.+?)==/gs, '<mark>$1</mark>')
    .replace(/\n/g, '<br>');
}

// Converts contentEditable innerHTML → inline markdown (for saving)
function nodeToMd(node) {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeType !== 1) return '';
  const inner = Array.from(node.childNodes).map(nodeToMd).join('');
  switch (node.tagName.toLowerCase()) {
    case 'strong': case 'b': return `**${inner}**`;
    case 'em':    case 'i': return `_${inner}_`;
    case 'u':               return `<u>${inner}</u>`;
    case 'mark':            return `==${inner}==`;
    case 'br':              return '\n';
    default:                return inner;
  }
}

export function htmlToInlineMarkdown(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return Array.from(tmp.childNodes).map(nodeToMd).join('');
}

// Serializes title + blocks → markdown string
// contentRefs: Map<blockId, DOMElement> — used to read live text content
export function serializeMarkdown(title, blocks, contentRefs) {
  const lines = [];
  if (title.trim()) lines.push('# ' + title.trim());

  let olIndex = 1;
  for (const block of blocks) {
    const el = contentRefs?.get(block.id);
    const text = el
      ? (block.type === 'code' ? el.textContent : htmlToInlineMarkdown(el.innerHTML))
      : block.content;

    switch (block.type) {
      case 'h1': lines.push('# ' + text); break;
      case 'h2': lines.push('## ' + text); break;
      case 'h3': lines.push('### ' + text); break;
      case 'ul':
        text.split('\n').forEach(l => lines.push('- ' + l));
        break;
      case 'ol':
        text.split('\n').forEach(l => lines.push(olIndex++ + '. ' + l));
        break;
      case 'blockquote': lines.push('> ' + text); break;
      case 'code': lines.push('```\n' + text + '\n```'); break;
      case 'hr': lines.push('---'); break;
      default: lines.push(text); break;
    }
  }

  return lines.join('\n') + '\n';
}
