import { useRef, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, CopyPlus, GripVertical, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { htmlToInlineMarkdown, inlineMarkdownToHTML } from '@/markdown';
import { readAssetUrl } from '@/fs';

const SHORTCUTS = [
  { pattern: /^# $/,     type: 'h1' },
  { pattern: /^## $/,    type: 'h2' },
  { pattern: /^### $/,   type: 'h3' },
  { pattern: /^- $/,     type: 'ul' },
  { pattern: /^\* $/,    type: 'ul' },
  { pattern: /^\+ $/,    type: 'ul' },
  { pattern: /^\d+\. $/, type: 'ol' },
  { pattern: /^\[\] $/,  type: 'todo' },
  { pattern: /^" $/,     type: 'blockquote' },
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
  onIndent,
  onToggleTodo,
  onDuplicate,
  onMove,
  onAddAfter,
  onPickImage,
  rootHandle,
}) {
  const ref = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [assetUrl, setAssetUrl] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (block.type !== 'image' || !block.src) return;
    let active = true;
    let url = '';
    readAssetUrl(rootHandle, block.src)
      .then(nextUrl => { if (active) { url = nextUrl; setAssetUrl(nextUrl); setImageError(false); } })
      .catch(() => { if (active) setImageError(true); });
    return () => {
      active = false;
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    };
  }, [block.type, block.src, rootHandle]);

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
  }, [block.id, block.type]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleInput(e) {
    const text = e.currentTarget.textContent;
    if (text.startsWith('/') && !text.includes('\n')) {
      onSlash(block.id, e.currentTarget.getBoundingClientRect(), text.slice(1));
      onChange(block.id);
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

  function handlePaste(e) {
    if (block.type === 'code') return;
    const text = e.clipboardData?.getData('text/plain')?.trim();
    const selection = window.getSelection();
    if (/^https?:\/\/\S+$/i.test(text || '') && selection && !selection.isCollapsed) {
      e.preventDefault();
      document.execCommand('createLink', false, text);
      onChange(block.id);
    }
  }

  function handleKeyDown(e) {
    const type = block.type;

    const typeShortcut = (e.metaKey && e.altKey) || (e.ctrlKey && e.shiftKey);
    if (typeShortcut) {
      const typeByKey = { '0': 'p', '1': 'h1', '2': 'h2', '3': 'h3', '4': 'todo', '5': 'ul', '6': 'ol', '8': 'code' };
      const shortcutKey = e.code?.startsWith('Digit') ? e.code.slice(5) : e.key;
      if (typeByKey[shortcutKey]) {
        e.preventDefault();
        onConvertType(block.id, typeByKey[shortcutKey]);
        return;
      }
    }

    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      onDuplicate(block.id);
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      onMove(block.id, e.key === 'ArrowUp' ? -1 : 1);
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && type === 'todo') {
      e.preventDefault();
      onToggleTodo(block.id);
      return;
    }

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
      if (e.shiftKey) return;
      e.preventDefault();
      const text = ref.current?.textContent || '';
      if ((type === 'ul' || type === 'ol' || type === 'todo') && text.trim() === '') {
        if ((block.indent || 0) > 0) onIndent(block.id, false);
        else onConvertType(block.id, 'p');
      } else {
        let tail = '';
        const selection = window.getSelection();
        if (selection?.rangeCount && ref.current?.contains(selection.anchorNode)) {
          const range = selection.getRangeAt(0);
          if (!range.collapsed) {
            range.deleteContents();
            range.collapse(true);
          }
          const tailRange = document.createRange();
          tailRange.selectNodeContents(ref.current);
          tailRange.setStart(range.startContainer, range.startOffset);
          const holder = document.createElement('div');
          holder.appendChild(tailRange.cloneContents());
          tail = block.type === 'code' ? holder.textContent : htmlToInlineMarkdown(holder.innerHTML);
          tailRange.deleteContents();
        }
        onEnter(block.id, tail);
      }
    } else if (e.key === 'Backspace') {
      const text = ref.current?.textContent || '';
      if (text.trim() === '') {
        e.preventDefault();
        if (type === 'ul' || type === 'ol' || type === 'todo') {
          if ((block.indent || 0) > 0) onIndent(block.id, false);
          else onConvertType(block.id, 'p');
        } else {
          onBackspace(block.id);
        }
      }
    } else if (e.key === 'ArrowUp' && !e.shiftKey) {
      if (isOnFirstLine(ref.current)) { e.preventDefault(); onArrowUp?.(block.id); }
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
      if (isOnLastLine(ref.current)) { e.preventDefault(); onArrowDown?.(block.id); }
    } else if (e.key === 'Tab') {
      if (type === 'code') {
        e.preventDefault();
        document.execCommand('insertText', false, '  ');
      } else if (type === 'ul' || type === 'ol' || type === 'todo') {
        e.preventDefault();
        onIndent(block.id, !e.shiftKey);
      }
    }
  }

  const isListType = block.type === 'ul' || block.type === 'ol' || block.type === 'todo';

  const contentEl = block.type === 'hr' ? null : (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={block.type === 'image' ? 'Add a caption…' : (isOnly ? "Type '/' for commands\u2026" : undefined)}
      className={cn(
        'block-content-editable flex-1 min-w-0 cursor-text',
        isOnly && 'slash-hint',
        block.type === 'h1' && '!text-[28px] font-bold leading-[1.3] tracking-tight',
        block.type === 'h2' && '!text-[22px] font-semibold leading-[1.35]',
        block.type === 'h3' && '!text-[18px] font-semibold leading-[1.4]',
        block.type === 'blockquote' && 'text-muted-foreground italic',
        block.type === 'todo' && block.checked && 'todo-complete',
        block.type === 'callout' && 'callout-content',
        block.type === 'image' && 'image-caption',
        block.type === 'code' && 'font-mono text-[13px] leading-[1.6] !px-4 !py-3 !bg-transparent',
      )}
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      spellCheck
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
        marginLeft: isListType ? `${Math.min(block.indent || 0, 4) * 26}px` : undefined,
        borderLeft: block.type === 'blockquote'
          ? '3px solid rgba(237,104,70,0.72)'
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
      {/* Block controls */}
      {block.type !== 'hr' && (
        <div className={cn('block-controls block-handle', isFocused || actionOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
          <button title="Add block below" onMouseDown={e => e.preventDefault()} onClick={() => onAddAfter(block.id)}><Plus size={14} /></button>
          <div className="block-grip" draggable title="Drag or click for actions" onDragStart={() => onDragStart(block.id)} onClick={() => setActionOpen(value => !value)}><GripVertical size={14} /></div>
          {actionOpen && (
            <div className="block-action-menu" onMouseLeave={() => setActionOpen(false)}>
              <button onClick={() => { onDuplicate(block.id); setActionOpen(false); }}><CopyPlus size={14} /> Duplicate <kbd>⌘D</kbd></button>
              <button onClick={() => { onMove(block.id, -1); setActionOpen(false); }}><ArrowUp size={14} /> Move up</button>
              <button onClick={() => { onMove(block.id, 1); setActionOpen(false); }}><ArrowDown size={14} /> Move down</button>
              <span />
              <button className="is-destructive" onClick={() => { onBackspace(block.id); setActionOpen(false); }}><Trash2 size={14} /> Delete</button>
            </div>
          )}
        </div>
      )}

      {/* List gutter */}
      {isListType && (
        <span
          className={cn('flex-shrink-0 w-7 text-right pr-2 text-muted-foreground select-none text-[15px]', block.type !== 'todo' && 'pointer-events-none')}
          style={{ lineHeight: '1.75', paddingTop: '2px' }}
        >
          {block.type === 'ul' && '•'}
          {block.type === 'ol' && `${olIndex}.`}
          {block.type === 'todo' && (
            <button
              className={cn('todo-checkbox', block.checked && 'is-checked')}
              aria-label={block.checked ? 'Mark incomplete' : 'Mark complete'}
              onMouseDown={e => e.preventDefault()}
              onClick={() => onToggleTodo(block.id)}
            >{block.checked && <Check size={11} strokeWidth={3} />}</button>
          )}
        </span>
      )}

      {/* HR */}
      {block.type === 'hr' && (
        <div
          className="w-full h-px transition-opacity"
          style={{
            background: isFocused
              ? 'linear-gradient(to right, transparent, rgba(237,104,70,0.75) 15%, rgba(237,104,70,0.75) 85%, transparent)'
              : 'linear-gradient(to right, transparent, hsl(var(--border)) 15%, hsl(var(--border)) 85%, transparent)',
          }}
        />
      )}

      {block.type === 'image' ? (
        <figure className="image-block">
          <div className="image-frame">
            {imageError ? (
              <div className="image-error">Image could not be loaded</div>
            ) : !assetUrl ? (
              <div className="image-error">Loading image…</div>
            ) : (
              <img src={assetUrl} alt={block.content || ''} onError={() => setImageError(true)} />
            )}
            <div className="image-actions">
              <button onClick={() => onPickImage(block.id)}>Replace</button>
              <button className="is-destructive" onClick={() => onBackspace(block.id)}><Trash2 size={13} /> Remove</button>
            </div>
          </div>
          {contentEl}
        </figure>
      ) : block.type === 'callout' ? (
        <div className="callout-block"><Lightbulb size={19} />{contentEl}</div>
      ) : block.type === 'code' ? (
        <div className="rounded-lg overflow-hidden" style={{ background: '#15201b', border: '1px solid hsl(var(--border))', color: '#e9eee8' }}>
          <div className="h-8 border-b border-white/10 flex items-center px-4" style={{ background: '#1d2a24' }}>
            <span className="text-[10px] font-mono tracking-[.18em] text-[#8fa198]">CODE</span>
          </div>
          {contentEl}
        </div>
      ) : (
        contentEl
      )}
    </div>
  );
}
