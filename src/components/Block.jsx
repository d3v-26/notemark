import { useRef, useEffect, useState } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inlineMarkdownToHTML } from '@/markdown';

const SHORTCUTS = [
  { pattern: /^# $/,     type: 'h1' },
  { pattern: /^## $/,    type: 'h2' },
  { pattern: /^### $/,   type: 'h3' },
  { pattern: /^- $/,     type: 'ul' },
  { pattern: /^\* $/,    type: 'ul' },
  { pattern: /^\d+\. $/, type: 'ol' },
  { pattern: /^> $/,     type: 'blockquote' },
  { pattern: /^```$/,    type: 'code' },
  { pattern: /^---$/,    type: 'hr' },
];

function isOnFirstLine(el) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return true;
  const r = sel.getRangeAt(0).getBoundingClientRect();
  if (r.top === 0 && r.bottom === 0) return true; // empty element
  const box = el.getBoundingClientRect();
  return r.top < box.top + el.scrollHeight / 2 - 2;
}

function isOnLastLine(el) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return true;
  const r = sel.getRangeAt(0).getBoundingClientRect();
  if (r.top === 0 && r.bottom === 0) return true; // empty element
  const box = el.getBoundingClientRect();
  return r.bottom > box.bottom - el.scrollHeight / 2 + 2;
}

export default function Block({
  block,
  contentRefs,
  autoFocusIds,
  olIndex,
  isOnly,
  onEnter,
  onExit,
  onBackspace,
  onConvertType,
  onSlash,
  onChange,
  onArrowUp,
  onArrowDown,
  onDragStart,
  onDrop,
}) {
  const ref = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Sync content to DOM only when block id changes (page switch / new block)
  useEffect(() => {
    if (!ref.current) return;
    contentRefs.set(block.id, ref.current);
    if (block.type === 'code') {
      ref.current.textContent = block.content;
    } else {
      ref.current.innerHTML = inlineMarkdownToHTML(block.content);
    }
    if (autoFocusIds.has(block.id)) {
      autoFocusIds.delete(block.id);
      ref.current.focus();
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    return () => contentRefs.delete(block.id);
  }, [block.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleInput(e) {
    const text = e.currentTarget.textContent;
    if (text === '/') {
      onSlash(block.id, e.currentTarget.getBoundingClientRect());
      return;
    }
    if (block.type === 'p') {
      for (const { pattern, type } of SHORTCUTS) {
        if (pattern.test(text)) {
          e.currentTarget.textContent = '';
          onConvertType(block.id, type);
          return;
        }
      }
    }
    onChange(block.id);
  }

  function handleKeyDown(e) {
    const type = block.type;

    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && type !== 'code') {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold');      onChange(block.id); return; }
      if (e.key === 'i') { e.preventDefault(); document.execCommand('italic');    onChange(block.id); return; }
      if (e.key === 'u') { e.preventDefault(); document.execCommand('underline'); onChange(block.id); return; }
    }

    if (type === 'code' && e.key === 'Escape') {
      e.preventDefault();
      onExit(block.id);
      return;
    }

    if (e.key === 'Enter') {
      if (type === 'code') return;
      e.preventDefault();
      const text = ref.current?.textContent || '';
      if ((type === 'ul' || type === 'ol') && text.trim() === '') {
        onConvertType(block.id, 'p');
      } else {
        onEnter(block.id);
      }
    } else if (e.key === 'Backspace') {
      const text = ref.current?.textContent || '';
      if (text.trim() === '') {
        e.preventDefault();
        if (type === 'ul' || type === 'ol') {
          onConvertType(block.id, 'p');
        } else {
          onBackspace(block.id);
        }
      }
    } else if (e.key === 'ArrowUp' && !e.shiftKey) {
      if (isOnFirstLine(ref.current)) { e.preventDefault(); onArrowUp?.(block.id); }
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
      if (isOnLastLine(ref.current)) { e.preventDefault(); onArrowDown?.(block.id); }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (type === 'code') document.execCommand('insertText', false, '  ');
    }
  }

  const isListType = block.type === 'ul' || block.type === 'ol';

  const contentEl = block.type === 'hr' ? null : (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={isOnly ? "Type '/' for commands\u2026" : undefined}
      className={cn(
        'block-content-editable flex-1 min-w-0 cursor-text',
        isOnly && 'slash-hint',
        block.type === 'h1' && '!text-[28px] font-bold leading-[1.3] tracking-tight',
        block.type === 'h2' && '!text-[22px] font-semibold leading-[1.35]',
        block.type === 'h3' && '!text-[18px] font-semibold leading-[1.4]',
        block.type === 'blockquote' && 'text-muted-foreground italic',
        block.type === 'code' && 'font-mono text-[13px] leading-[1.6] !px-4 !py-3 !bg-transparent',
      )}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );

  return (
    <div
      className={cn(
        'group relative py-0.5 min-h-[1.75em] outline-none',
        isDragOver && 'block-drag-over',
        block.type === 'hr' && 'py-2.5 min-h-0',
        isListType && 'flex items-start gap-0',
        block.type === 'blockquote' && 'pl-4 relative',
        block.type === 'code' && 'my-1',
      )}
      style={{
        borderLeft: block.type === 'blockquote'
          ? '3px solid rgba(124,58,237,0.6)'
          : undefined,
      }}
      tabIndex={block.type === 'hr' ? 0 : undefined}
      onFocus={block.type === 'hr' ? () => setIsFocused(true) : undefined}
      onBlur={block.type === 'hr' ? () => setIsFocused(false) : undefined}
      onKeyDown={block.type === 'hr' ? (e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          onBackspace(block.id);
        }
      } : undefined}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => { setIsDragOver(false); onDrop(block.id); }}
      onDragEnd={() => setIsDragOver(false)}
    >
      {/* Drag handle */}
      {block.type !== 'hr' && (
        <div
          draggable
          onDragStart={() => onDragStart(block.id)}
          className={cn('absolute -left-7 top-1 w-5 h-5 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground cursor-grab rounded transition-opacity', isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
        >
          <GripVertical size={14} />
        </div>
      )}

      {/* List gutter */}
      {isListType && (
        <span
          className="flex-shrink-0 w-7 text-right pr-2 text-muted-foreground select-none pointer-events-none text-[15px]"
          style={{ lineHeight: '1.75', paddingTop: '2px' }}
        >
          {block.type === 'ul' ? '•' : `${olIndex}.`}
        </span>
      )}

      {/* HR */}
      {block.type === 'hr' && (
        <div
          className="w-full h-px transition-opacity"
          style={{
            background: isFocused
              ? 'linear-gradient(to right, transparent, rgba(124,58,237,0.7) 15%, rgba(124,58,237,0.7) 85%, transparent)'
              : 'linear-gradient(to right, transparent, hsl(var(--border)) 15%, hsl(var(--border)) 85%, transparent)',
          }}
        />
      )}

      {block.type === 'code' ? (
        <div className="rounded-lg overflow-hidden" style={{ background: '#0a0a0a', border: '1px solid hsl(var(--border))' }}>
          <div className="h-8 border-b border-border flex items-center px-4" style={{ background: '#141414' }}>
            <span className="text-[11px] font-mono tracking-widest text-muted-foreground/50">code</span>
          </div>
          {contentEl}
        </div>
      ) : (
        contentEl
      )}
    </div>
  );
}
