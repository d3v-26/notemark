import { useState, useEffect, useRef } from 'react';
import {
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code2, Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BLOCK_TYPES = [
  { type: 'h1',         label: 'Heading 1',     desc: 'Large heading',     Icon: Heading1 },
  { type: 'h2',         label: 'Heading 2',     desc: 'Medium heading',    Icon: Heading2 },
  { type: 'h3',         label: 'Heading 3',     desc: 'Small heading',     Icon: Heading3 },
  { type: 'ul',         label: 'Bullet List',   desc: 'Unordered list',    Icon: List },
  { type: 'ol',         label: 'Numbered List', desc: 'Ordered list',      Icon: ListOrdered },
  { type: 'blockquote', label: 'Quote',         desc: 'Highlighted callout', Icon: Quote },
  { type: 'code',       label: 'Code Block',    desc: 'Monospace code',    Icon: Code2 },
  { type: 'hr',         label: 'Divider',       desc: 'Horizontal rule',   Icon: Minus },
];

export default function SlashMenu({ targetRect, onSelect, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(i => (i + 1) % BLOCK_TYPES.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(i => (i - 1 + BLOCK_TYPES.length) % BLOCK_TYPES.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onSelect(BLOCK_TYPES[selectedIndex].type);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedIndex, onSelect, onClose]);

  if (!targetRect) return null;

  const menuWidth = 260;
  const menuHeight = 370; // estimated height for all 8 items + header
  const left = Math.min(targetRect.left, window.innerWidth - menuWidth - 8);
  const spaceBelow = window.innerHeight - targetRect.bottom - 8;
  const top = spaceBelow >= menuHeight
    ? targetRect.bottom + 4
    : Math.max(8, targetRect.top - menuHeight - 4);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', left, top, width: menuWidth, zIndex: 200 }}
      className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
    >
      <div className="px-2.5 py-1.5 text-[10px] font-bold tracking-widest uppercase text-muted-foreground/60 select-none">
        Blocks
      </div>
      {BLOCK_TYPES.map(({ type, label, desc, Icon }, i) => (
        <div
          key={type}
          className={cn(
            'flex items-center gap-2.5 px-2.5 py-1.5 cursor-pointer transition-colors rounded-sm mx-1 mb-0.5',
            i === selectedIndex
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent hover:text-accent-foreground'
          )}
          onMouseEnter={() => setSelectedIndex(i)}
          onMouseDown={(e) => { e.preventDefault(); onSelect(type); }}
        >
          <div className={cn(
            'w-7 h-7 flex items-center justify-center rounded-md border flex-shrink-0 transition-colors',
            i === selectedIndex
              ? 'bg-white/15 border-transparent text-white'
              : 'bg-secondary border-border text-muted-foreground'
          )}>
            <Icon size={14} />
          </div>
          <div className="flex flex-col gap-px">
            <span className="text-[13px] leading-none font-medium">{label}</span>
            <span className={cn(
              'text-[11px] leading-none',
              i === selectedIndex ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>{desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
