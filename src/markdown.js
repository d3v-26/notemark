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

    const indentMatch = line.match(/^(\s*)/);
    const indent = Math.floor((indentMatch?.[1].replace(/\t/g, '  ').length || 0) / 2);
    const trimmedLine = line.trimStart();

    if (line.startsWith('# ') && !line.startsWith('## ') && !titleSet) {
      title = line.slice(2);
      titleSet = true;
    } else if (line.startsWith('### ')) {
      blocks.push({ id: genId(), type: 'h3', content: line.slice(4) });
    } else if (line.startsWith('## ')) {
      blocks.push({ id: genId(), type: 'h2', content: line.slice(3) });
    } else if (line.startsWith('# ')) {
      blocks.push({ id: genId(), type: 'h1', content: line.slice(2) });
    } else if (trimmedLine.match(/^!\[.*\]\(.+\)$/)) {
      const image = trimmedLine.match(/^!\[(.*)\]\((.+)\)$/);
      blocks.push({ id: genId(), type: 'image', content: image[1], src: image[2] });
    } else if (trimmedLine.match(/^[-*] \[[ xX]\] /)) {
      blocks.push({
        id: genId(), type: 'todo', indent,
        checked: /^[-*] \[[xX]\]/.test(trimmedLine),
        content: trimmedLine.replace(/^[-*] \[[ xX]\]\s/, ''),
      });
    } else if (trimmedLine.match(/^[-*] /)) {
      blocks.push({ id: genId(), type: 'ul', indent, content: trimmedLine.slice(2) });
    } else if (trimmedLine.match(/^\d+\. /)) {
      blocks.push({ id: genId(), type: 'ol', indent, content: trimmedLine.replace(/^\d+\.\s/, '') });
    } else if (line.startsWith('> [!NOTE] ')) {
      blocks.push({ id: genId(), type: 'callout', content: line.slice(10) });
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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const safeHref = /^(https?:|mailto:|#|\.\.?\/|\/)/i.test(href) ? href.replace(/"/g, '&quot;') : '#';
      return `<a href="${safeHref}" target="_blank" rel="noreferrer">${label}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
    .replace(/~~(.+?)~~/gs, '<s>$1</s>')
    .replace(/`(.+?)`/gs, '<code>$1</code>')
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
    case 's': case 'strike': return `~~${inner}~~`;
    case 'code':             return `\`${inner}\``;
    case 'a':                return `[${inner}](${node.getAttribute('href') || ''})`;
    case 'br':              return '\n';
    case 'div': case 'p':   return inner + '\n';
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

  const olCounts = [0, 0, 0, 0, 0];
  for (const block of blocks) {
    const el = contentRefs?.get(block.id);
    const text = el
      ? (block.type === 'code' ? el.textContent : htmlToInlineMarkdown(el.innerHTML))
      : block.content;

    const indent = '  '.repeat(block.indent || 0);
    const olIndent = Math.min(block.indent || 0, 4);
    if (block.type === 'ol') {
      olCounts[olIndent] += 1;
      olCounts.fill(0, olIndent + 1);
    } else if (!['ul', 'todo'].includes(block.type)) {
      olCounts.fill(0);
    }

    switch (block.type) {
      case 'h1': lines.push('# ' + text); break;
      case 'h2': lines.push('## ' + text); break;
      case 'h3': lines.push('### ' + text); break;
      case 'ul':
        text.split('\n').forEach(l => lines.push(indent + '- ' + l));
        break;
      case 'ol':
        text.split('\n').forEach((l, index) => lines.push(indent + (olCounts[olIndent] + index) + '. ' + l));
        break;
      case 'todo': lines.push(`${indent}- [${block.checked ? 'x' : ' '}] ${text}`); break;
      case 'callout': lines.push('> [!NOTE] ' + text); break;
      case 'image': lines.push(`![${text.replace(/\]/g, '\\]')}](${block.src})`); break;
      case 'blockquote': lines.push('> ' + text); break;
      case 'code': lines.push('```\n' + text + '\n```'); break;
      case 'hr': lines.push('---'); break;
      default: lines.push(text); break;
    }
  }

  return lines.join('\n') + '\n';
}
