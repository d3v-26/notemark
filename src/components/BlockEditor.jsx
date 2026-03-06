import { useState, useEffect, useRef, useCallback } from 'react';
import { readFilePage, writeFilePage } from '@/fs';
import { parseMarkdown, serializeMarkdown } from '@/markdown';
import Block from './Block';
import SlashMenu from './SlashMenu';
import FormatToolbar from './FormatToolbar';
import PageOutline from './PageOutline';

let blockIdCounter = 0;
function genBlockId() { return `blk${++blockIdCounter}`; }

export default function BlockEditor({ rootHandle, currentPage, sidebarOpen, onToggleSidebar }) {
  const [blocks, setBlocks] = useState([]);
  const [saveState, setSaveState] = useState('idle'); // 'saving' | 'saved' | 'idle'
  const [slashMenu, setSlashMenu] = useState(null); // { blockId, rect }
  const [formatBar, setFormatBar] = useState(null); // { rect } | null

  const titleRef = useRef(null);
  const contentRefs = useRef(new Map()); // Map<blockId, DOMElement>
  const autoFocusIds = useRef(new Set());
  const dragState = useRef(null);
  const saveTimerRef = useRef(null);
  const scrollRef = useRef(null);

  // Load page on mount (keyed by currentPage, so always fresh)
  useEffect(() => {
    async function load() {
      try {
        const data = await readFilePage(rootHandle, currentPage);
        const { title, blocks: parsed } = parseMarkdown(data.content, data.name);
        if (titleRef.current) titleRef.current.textContent = title;
        setBlocks(parsed);
      } catch (e) {
        console.error('Failed to load page:', e);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doSave = useCallback(async () => {
    if (!currentPage || !rootHandle) return;
    const title = titleRef.current?.textContent?.trim() || '';
    const content = serializeMarkdown(title, blocks, contentRefs.current);
    await writeFilePage(rootHandle, currentPage, content);
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 1500);
  }, [currentPage, rootHandle, blocks]);

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    saveTimerRef.current = setTimeout(doSave, 800);
  }, [doSave]);

  // Show format toolbar on text selection
  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setFormatBar(null); return; }
      const anchor = sel.anchorNode;
      const inEditor = [...contentRefs.current.values()].some(el => el.contains(anchor));
      if (!inEditor) { setFormatBar(null); return; }
      setFormatBar({ rect: sel.getRangeAt(0).getBoundingClientRect() });
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  // Close slash menu on click outside
  useEffect(() => {
    function handler(e) {
      if (slashMenu) setSlashMenu(null);
    }
    if (slashMenu) {
      window.addEventListener('click', handler, { once: true });
      return () => window.removeEventListener('click', handler);
    }
  }, [slashMenu]);

  // ── Block operations ──

  function handleEnter(blockId) {
    const src = blocks.find(b => b.id === blockId);
    const newType = (src?.type === 'ul' || src?.type === 'ol') ? src.type : 'p';
    const newId = genBlockId();
    autoFocusIds.current.add(newId);
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      const next = [...prev];
      next.splice(idx + 1, 0, { id: newId, type: newType, content: '' });
      return next;
    });
    scheduleSave();
  }

  function handleConvertType(blockId, newType) {
    if (newType === 'hr') {
      const newId = genBlockId();
      autoFocusIds.current.add(newId);
      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === blockId);
        const next = [...prev];
        next[idx] = { ...next[idx], type: 'hr', content: '' };
        next.splice(idx + 1, 0, { id: newId, type: 'p', content: '' });
        return next;
      });
    } else {
      setBlocks(prev =>
        prev.map(b => b.id === blockId ? { ...b, type: newType, content: '' } : b)
      );
      setTimeout(() => contentRefs.current.get(blockId)?.focus(), 0);
    }
    scheduleSave();
  }

  function handleBackspace(blockId) {
    setBlocks(prev => {
      if (prev.length === 1) return prev; // keep at least one block
      const idx = prev.findIndex(b => b.id === blockId);
      const next = [...prev];
      next.splice(idx, 1);

      // Focus previous (or first) block
      const prevBlock = next[Math.max(0, idx - 1)];
      if (prevBlock) {
        setTimeout(() => {
          const el = contentRefs.current.get(prevBlock.id);
          if (!el) return;
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }, 0);
      }
      return next;
    });
    scheduleSave();
  }

  function handleSlash(blockId, rect) {
    setSlashMenu({ blockId, rect });
  }

  function handleChange(blockId) {
    // If slash menu is open for this block but content changed away from '/'
    if (slashMenu?.blockId === blockId) {
      const el = contentRefs.current.get(blockId);
      if (el?.textContent !== '/') setSlashMenu(null);
    }
    scheduleSave();
  }

  function handleArrowUp(blockId) {
    const idx = blocks.findIndex(b => b.id === blockId);
    const prevBlock = blocks[idx - 1];
    if (prevBlock) contentRefs.current.get(prevBlock.id)?.focus();
  }

  function handleArrowDown(blockId) {
    const idx = blocks.findIndex(b => b.id === blockId);
    const nextBlock = blocks[idx + 1];
    if (nextBlock) contentRefs.current.get(nextBlock.id)?.focus();
  }

  function handleExit(blockId) {
    const idx = blocks.findIndex(b => b.id === blockId);
    const nextBlock = blocks[idx + 1];
    if (nextBlock) {
      contentRefs.current.get(nextBlock.id)?.focus();
    } else {
      handleEnter(blockId);
    }
  }

  function handleDragStart(blockId) {
    dragState.current = blockId;
  }

  function handleDrop(targetId) {
    const fromId = dragState.current;
    dragState.current = null;
    if (!fromId || fromId === targetId) return;
    setBlocks(prev => {
      const fromIdx = prev.findIndex(b => b.id === fromId);
      const toIdx = prev.findIndex(b => b.id === targetId);
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    scheduleSave();
  }

  function handleSlashSelect(type) {
    if (!slashMenu) return;
    const { blockId } = slashMenu;
    setSlashMenu(null);

    // Clear the "/" content from DOM
    const el = contentRefs.current.get(blockId);
    if (el) el.textContent = '';

    if (type === 'hr') {
      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === blockId);
        const next = [...prev];
        next[idx] = { ...next[idx], type: 'hr', content: '' };
        if (idx === next.length - 1) {
          const newId = genBlockId();
          autoFocusIds.current.add(newId);
          next.push({ id: newId, type: 'p', content: '' });
        } else {
          const nextBlockId = next[idx + 1].id;
          setTimeout(() => contentRefs.current.get(nextBlockId)?.focus(), 0);
        }
        return next;
      });
    } else {
      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === blockId);
        const next = [...prev];
        next[idx] = { ...next[idx], type, content: '' };
        return next;
      });
      // Re-focus the block after type change
      setTimeout(() => el?.focus(), 0);
    }
    scheduleSave();
  }

  // Compute ol start indices
  const olIndices = [];
  let olCount = 0;
  for (const block of blocks) {
    if (block.type === 'ol') {
      olIndices.push(olCount + 1);
      olCount++;
    } else {
      olIndices.push(1);
      olCount = 0;
    }
  }

  const headings = blocks.filter(b => b.type === 'h1' || b.type === 'h2' || b.type === 'h3');
  const breadcrumb = currentPage.replace(/\.md$/, '').replace(/\//g, ' / ');

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      {/* Topbar */}
      <div
        className="flex items-center justify-between px-12 h-12 flex-shrink-0 border-b border-border"
        style={{ background: 'hsl(var(--background))' }}
      >
        <span className="text-[13px] text-muted-foreground/40 truncate">{breadcrumb}</span>
        <span
          className={
            saveState === 'saving' ? 'text-[12px] text-muted-foreground flex-shrink-0' :
            saveState === 'saved'  ? 'text-[12px] flex-shrink-0' : 'text-[12px] flex-shrink-0 invisible'
          }
          style={saveState === 'saved' ? { color: '#a78bfa' } : undefined}
        >
          {saveState === 'saving' ? 'Saving\u2026' : 'Saved'}
        </span>
      </div>

      {/* Editor area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex justify-center items-start px-12 py-16">
        <div className="w-full max-w-[700px]">
          {/* Page title */}
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Untitled"
            className="page-title-input mb-7"
            onInput={scheduleSave}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const firstBlock = blocks[0];
                if (firstBlock) contentRefs.current.get(firstBlock.id)?.focus();
              }
            }}
          />

          {/* Blocks */}
          <div
            className="relative pl-8 min-h-[40vh]"
            onClick={e => {
              if (!e.target.closest('[contenteditable]') && !e.target.closest('.block-handle')) {
                const lastBlock = blocks[blocks.length - 1];
                if (lastBlock) contentRefs.current.get(lastBlock.id)?.focus();
              }
            }}
          >
            {blocks.map((block, i) => (
              <Block
                key={block.id}
                block={block}
                contentRefs={contentRefs.current}
                autoFocusIds={autoFocusIds.current}
                olIndex={olIndices[i]}
                isOnly={blocks.length === 1}
                onEnter={handleEnter}
                onExit={handleExit}
                onBackspace={handleBackspace}
                onConvertType={handleConvertType}
                onSlash={handleSlash}
                onChange={handleChange}
                onArrowUp={handleArrowUp}
                onArrowDown={handleArrowDown}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Slash menu */}
      {slashMenu && (
        <SlashMenu
          targetRect={slashMenu.rect}
          onSelect={handleSlashSelect}
          onClose={() => setSlashMenu(null)}
        />
      )}

      {/* Format toolbar */}
      {formatBar && (
        <FormatToolbar
          rect={formatBar.rect}
          onFormatApplied={scheduleSave}
        />
      )}

      {/* Page outline */}
      <PageOutline
        headings={headings}
        contentRefs={contentRefs}
        scrollContainer={scrollRef}
      />
    </div>
  );
}
