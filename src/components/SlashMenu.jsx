import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignLeft, CheckSquare2, Heading1, Heading2, Heading3, List,
  Image, ListOrdered, MessageSquareWarning, Quote, Code2, Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BLOCK_TYPES = [
  { type: 'p', label: 'Text', desc: 'Plain text block', keywords: 'plain paragraph', Icon: AlignLeft },
  { type: 'todo', label: 'To-do', desc: 'Track a task', keywords: 'checkbox task check', Icon: CheckSquare2 },
  { type: 'h1', label: 'Heading 1', desc: 'Large section heading', keywords: 'h1 title #', Icon: Heading1 },
  { type: 'h2', label: 'Heading 2', desc: 'Medium section heading', keywords: 'h2 subtitle ##', Icon: Heading2 },
  { type: 'h3', label: 'Heading 3', desc: 'Small section heading', keywords: 'h3 ###', Icon: Heading3 },
  { type: 'ul', label: 'Bulleted list', desc: 'Simple unordered list', keywords: 'bullet list -', Icon: List },
  { type: 'ol', label: 'Numbered list', desc: 'Ordered steps', keywords: 'number num list 1.', Icon: ListOrdered },
  { type: 'blockquote', label: 'Quote', desc: 'Pull out a quotation', keywords: 'quote citation "', Icon: Quote },
  { type: 'callout', label: 'Callout', desc: 'Highlight useful context', keywords: 'note info alert tip', Icon: MessageSquareWarning },
  { type: 'image', label: 'Image', desc: 'Upload from your device', keywords: 'photo picture media upload', Icon: Image },
  { type: 'code', label: 'Code', desc: 'Preformatted code block', keywords: 'code snippet ```', Icon: Code2 },
  { type: 'hr', label: 'Divider', desc: 'Visually separate sections', keywords: 'divider line separator ---', Icon: Minus },
];

export default function SlashMenu({ targetRect, query = '', onSelect, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef([]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return BLOCK_TYPES;
    return BLOCK_TYPES.filter(item => `${item.label} ${item.keywords}`.toLowerCase().includes(needle));
  }, [query]);

  useEffect(() => setSelectedIndex(0), [query]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (!filtered.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        setSelectedIndex(i => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        onSelect(filtered[selectedIndex]?.type);
      } else if (e.key === 'Escape') {
        e.preventDefault(); onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (!targetRect) return null;
  const menuWidth = 286;
  const menuHeight = Math.min(430, 54 + Math.max(1, filtered.length) * 48);
  const left = Math.max(8, Math.min(targetRect.left, window.innerWidth - menuWidth - 8));
  const spaceBelow = window.innerHeight - targetRect.bottom - 8;
  const top = spaceBelow >= menuHeight ? targetRect.bottom + 5 : Math.max(8, targetRect.top - menuHeight - 5);

  return (
    <div style={{ position: 'fixed', left, top, width: menuWidth, zIndex: 200 }} className="slash-menu">
      <div className="slash-menu-heading">
        <span>{query ? `Results for “${query}”` : 'Insert a block'}</span>
        <kbd>ESC</kbd>
      </div>
      <div className="slash-menu-list">
        {!filtered.length && <div className="slash-menu-empty">No matching blocks</div>}
        {filtered.map(({ type, label, desc, Icon }, i) => (
          <button
            key={type}
            ref={element => { itemRefs.current[i] = element; }}
            className={cn('slash-menu-item', i === selectedIndex && 'is-selected')}
            onMouseEnter={() => setSelectedIndex(i)}
            onMouseDown={e => { e.preventDefault(); onSelect(type); }}
          >
            <span className="slash-menu-icon"><Icon size={15} /></span>
            <span><strong>{label}</strong><small>{desc}</small></span>
            {i === selectedIndex && <kbd>↵</kbd>}
          </button>
        ))}
      </div>
      <div className="slash-menu-footer">Type to filter · ↑↓ to navigate</div>
    </div>
  );
}
