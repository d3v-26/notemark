import { useState, useEffect, useRef, useCallback } from 'react';
import { readFilePage, writeAssetFile, writeFilePage } from '@/fs';
import { htmlToInlineMarkdown, parseMarkdown, serializeMarkdown } from '@/markdown';
import Block from './Block';
import SlashMenu from './SlashMenu';
import FormatToolbar from './FormatToolbar';
import PageOutline from './PageOutline';
import { AlertCircle, Check, Copy, Download, ImagePlus, Menu, MoreHorizontal, PanelTop, Type } from 'lucide-react';

let blockIdCounter = 0;
function genBlockId() { return `blk${++blockIdCounter}`; }

export default function BlockEditor({ rootHandle, currentPage, sidebarOpen, onToggleSidebar }) {
  const [blocks, setBlocks] = useState([]);
  const [saveState, setSaveState] = useState('idle'); // 'saving' | 'saved' | 'idle'
  const [wordCount, setWordCount] = useState(0);
  const [slashMenu, setSlashMenu] = useState(null); // { blockId, rect }
  const [formatBar, setFormatBar] = useState(null); // { rect } | null
  const [copyState, setCopyState] = useState('idle');
  const [moreOpen, setMoreOpen] = useState(false);
  const [pageWide, setPageWide] = useState(() => localStorage.getItem('notemark:wide') === 'true');
  const [pageFont, setPageFont] = useState(() => localStorage.getItem('notemark:font') || 'serif');

  const titleRef = useRef(null);
  const contentRefs = useRef(new Map()); // Map<blockId, DOMElement>
  const autoFocusIds = useRef(new Set());
  const dragState = useRef(null);
  const saveTimerRef = useRef(null);
  const scrollRef = useRef(null);
  const blocksRef = useRef([]);
  const dismissedSlashIds = useRef(new Set());
  const imageInputRef = useRef(null);
  const imageTargetRef = useRef(null);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('notemark:wide', String(pageWide));
    localStorage.setItem('notemark:font', pageFont);
  }, [pageWide, pageFont]);

  useEffect(() => {
    function closeMenu(event) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  // Load page on mount (keyed by currentPage, so always fresh)
  useEffect(() => {
    async function load() {
      try {
        const data = await readFilePage(rootHandle, currentPage);
        const { title, blocks: parsed } = parseMarkdown(data.content, data.name);
        if (titleRef.current) titleRef.current.textContent = title;
        blocksRef.current = parsed;
        setBlocks(parsed);
        updateWordCount(parsed, title);
      } catch (e) {
        console.error('Failed to load page:', e);
        setSaveState('error');
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function updateWordCount(nextBlocks = blocksRef.current, title = titleRef.current?.textContent || '') {
    const body = nextBlocks.map(block => contentRefs.current.get(block.id)?.textContent || block.content || '').join(' ');
    setWordCount(`${title} ${body}`.trim().split(/\s+/).filter(Boolean).length);
  }

  const doSave = useCallback(async () => {
    if (!currentPage || !rootHandle) return;
    const title = titleRef.current?.textContent?.trim() || '';
    const content = serializeMarkdown(title, blocksRef.current, contentRefs.current);
    try {
      await writeFilePage(rootHandle, currentPage, content);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1800);
    } catch (error) {
      console.error('Failed to save page:', error);
      setSaveState('error');
    }
  }, [currentPage, rootHandle]);

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    updateWordCount();
    saveTimerRef.current = setTimeout(doSave, 800);
  }, [doSave]);

  useEffect(() => () => {
    clearTimeout(saveTimerRef.current);
  }, []);

  function updateBlocks(updater) {
    const next = typeof updater === 'function' ? updater(blocksRef.current) : updater;
    blocksRef.current = next;
    setBlocks(next);
  }

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
      if (slashMenu) {
        dismissedSlashIds.current.add(slashMenu.blockId);
        setSlashMenu(null);
      }
    }
    if (slashMenu) {
      window.addEventListener('click', handler, { once: true });
      return () => window.removeEventListener('click', handler);
    }
  }, [slashMenu]);

  // ── Block operations ──

  function liveContent(block) {
    const el = contentRefs.current.get(block.id);
    if (!el) return block.content || '';
    return block.type === 'code' ? el.textContent : htmlToInlineMarkdown(el.innerHTML);
  }

  function handleEnter(blockId, tailContent = '') {
    const src = blocks.find(b => b.id === blockId);
    const continuesList = src?.type === 'ul' || src?.type === 'ol' || src?.type === 'todo';
    const newType = continuesList ? src.type : 'p';
    const newId = genBlockId();
    autoFocusIds.current.add(newId);
    updateBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      const next = [...prev];
      next.splice(idx + 1, 0, {
        id: newId,
        type: newType,
        content: tailContent,
        ...(continuesList ? { indent: src.indent || 0 } : {}),
        ...(newType === 'todo' ? { checked: false } : {}),
      });
      return next;
    });
    scheduleSave();
  }

  function handleConvertType(blockId, newType) {
    if (newType === 'hr') {
      const newId = genBlockId();
      autoFocusIds.current.add(newId);
      updateBlocks(prev => {
        const idx = prev.findIndex(b => b.id === blockId);
        const next = [...prev];
        next[idx] = { ...next[idx], type: 'hr', content: '', indent: 0 };
        next.splice(idx + 1, 0, { id: newId, type: 'p', content: '' });
        return next;
      });
    } else {
      updateBlocks(prev =>
        prev.map(b => b.id === blockId ? {
          ...b, type: newType, content: liveContent(b), indent: 0,
          ...(newType === 'todo' ? { checked: false } : {}),
        } : b)
      );
      setTimeout(() => contentRefs.current.get(blockId)?.focus(), 0);
    }
    scheduleSave();
  }

  function handleBackspace(blockId) {
    updateBlocks(prev => {
      if (prev.length === 1) {
        const el = contentRefs.current.get(blockId);
        if (el) el.textContent = '';
        return [{ ...prev[0], type: 'p', content: '', indent: 0, checked: false }];
      }
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

  function handleSlash(blockId, rect, query = '') {
    if (dismissedSlashIds.current.has(blockId)) return;
    setSlashMenu({ blockId, rect, query });
  }

  function handleChange(blockId) {
    updateBlocks(prev => prev.map(block => block.id === blockId ? { ...block, content: liveContent(block) } : block));
    // If slash menu is open for this block but content changed away from '/'
    if (slashMenu?.blockId === blockId) {
      const el = contentRefs.current.get(blockId);
      if (!el?.textContent?.startsWith('/')) setSlashMenu(null);
    }
    const el = contentRefs.current.get(blockId);
    if (!el?.textContent?.startsWith('/')) dismissedSlashIds.current.delete(blockId);
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
    updateBlocks(prev => {
      const fromIdx = prev.findIndex(b => b.id === fromId);
      const toIdx = prev.findIndex(b => b.id === targetId);
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    scheduleSave();
  }

  function handleIndent(blockId, increase) {
    updateBlocks(prev => {
      const idx = prev.findIndex(block => block.id === blockId);
      if (idx < 0) return prev;
      const current = prev[idx];
      const oldIndent = current.indent || 0;
      const nextIndent = Math.max(0, Math.min(4, oldIndent + (increase ? 1 : -1)));
      if (increase) {
        const previous = prev[idx - 1];
        const previousIsList = previous && ['ul', 'ol', 'todo'].includes(previous.type);
        if (!previousIsList || (previous.indent || 0) < oldIndent) return prev;
      }
      if (nextIndent === oldIndent) return prev;
      return prev.map(block => block.id === blockId ? { ...block, indent: nextIndent } : block);
    });
    scheduleSave();
  }

  function handleToggleTodo(blockId) {
    updateBlocks(prev => prev.map(block => block.id === blockId ? { ...block, checked: !block.checked } : block));
    scheduleSave();
  }

  function handleDuplicate(blockId) {
    const newId = genBlockId();
    updateBlocks(prev => {
      const idx = prev.findIndex(block => block.id === blockId);
      if (idx < 0) return prev;
      const source = prev[idx];
      const duplicate = { ...source, id: newId, content: liveContent(source) };
      const next = [...prev];
      next.splice(idx + 1, 0, duplicate);
      return next;
    });
    scheduleSave();
  }

  function handleMove(blockId, direction) {
    updateBlocks(prev => {
      const idx = prev.findIndex(block => block.id === blockId);
      const target = idx + direction;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
    scheduleSave();
  }

  function handleAddAfter(blockId) {
    const newId = genBlockId();
    autoFocusIds.current.add(newId);
    updateBlocks(prev => {
      const idx = prev.findIndex(block => block.id === blockId);
      const next = [...prev];
      next.splice(idx + 1, 0, { id: newId, type: 'p', content: '' });
      return next;
    });
    scheduleSave();
  }

  function handlePickImage(blockId) {
    imageTargetRef.current = blockId;
    imageInputRef.current?.click();
  }

  async function handleImageSelected(event) {
    const file = event.target.files?.[0];
    const blockId = imageTargetRef.current;
    event.target.value = '';
    if (!file || !blockId) return;
    if (!file.type.startsWith('image/')) {
      setSaveState('error');
      return;
    }
    try {
      const src = await writeAssetFile(rootHandle, file);
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      updateBlocks(prev => prev.map(block => block.id === blockId
        ? { ...block, type: 'image', src, content: block.type === 'image' ? liveContent(block) : alt, indent: 0 }
        : block));
      scheduleSave();
    } catch (error) {
      console.error('Failed to add image:', error);
      setSaveState('error');
    }
  }

  function handleAddImage() {
    const newId = genBlockId();
    updateBlocks(prev => [...prev, { id: newId, type: 'p', content: '' }]);
    setMoreOpen(false);
    setTimeout(() => handlePickImage(newId), 0);
  }

  function handleSlashSelect(type) {
    if (!slashMenu) return;
    const { blockId } = slashMenu;
    dismissedSlashIds.current.delete(blockId);
    setSlashMenu(null);

    // Clear the "/" content from DOM
    const el = contentRefs.current.get(blockId);
    if (el) el.textContent = '';

    if (type === 'image') {
      updateBlocks(prev => prev.map(block => block.id === blockId ? { ...block, type: 'p', content: '' } : block));
      scheduleSave();
      setTimeout(() => handlePickImage(blockId), 0);
      return;
    }

    if (type === 'hr') {
      updateBlocks(prev => {
        const idx = prev.findIndex(b => b.id === blockId);
        const next = [...prev];
        next[idx] = { ...next[idx], type: 'hr', content: '', indent: 0 };
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
      updateBlocks(prev => {
        const idx = prev.findIndex(b => b.id === blockId);
        const next = [...prev];
        next[idx] = {
          ...next[idx], type, content: '', indent: 0,
          ...(type === 'todo' ? { checked: false } : {}),
        };
        return next;
      });
      // Re-focus the block after type change
      setTimeout(() => el?.focus(), 0);
    }
    scheduleSave();
  }

  // Compute ol start indices
  const olIndices = [];
  const olCounts = [0, 0, 0, 0, 0];
  for (const block of blocks) {
    if (block.type === 'ol') {
      const indent = Math.min(block.indent || 0, 4);
      olCounts[indent] += 1;
      olCounts.fill(0, indent + 1);
      olIndices.push(olCounts[indent]);
    } else {
      olIndices.push(1);
      if (!['ul', 'todo'].includes(block.type)) olCounts.fill(0);
    }
  }

  const headings = blocks.filter(b => b.type === 'h1' || b.type === 'h2' || b.type === 'h3');
  const breadcrumb = currentPage.replace(/\.md$/, '').replace(/\//g, ' / ');

  async function copyMarkdown() {
    const title = titleRef.current?.textContent?.trim() || '';
    const content = serializeMarkdown(title, blocksRef.current, contentRefs.current);
    try {
      await navigator.clipboard.writeText(content);
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }
    setTimeout(() => setCopyState('idle'), 1800);
  }

  function downloadMarkdown() {
    const title = titleRef.current?.textContent?.trim() || 'Untitled';
    const content = serializeMarkdown(title, blocksRef.current, contentRefs.current);
    const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${title.replace(/[\\/:*?"<>|]/g, '-').trim() || 'Untitled'}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMoreOpen(false);
  }

  function cycleFont() {
    const fonts = ['serif', 'sans', 'mono'];
    setPageFont(current => fonts[(fonts.indexOf(current) + 1) % fonts.length]);
  }

  return (
    <div className="editor-shell flex-1 flex flex-col min-h-0 overflow-hidden bg-background">
      {/* Topbar */}
      <div className="editor-topbar">
        <div className="flex items-center min-w-0 gap-2">
          {!sidebarOpen && <button className="icon-button" title="Open sidebar" onClick={onToggleSidebar}><Menu size={17} /></button>}
          <span className="breadcrumb truncate">{breadcrumb}</span>
        </div>
        <div className="editor-meta">
          <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
          <span className={`save-status save-${saveState}`}>
            {saveState === 'saving' && <><span className="saving-pulse" /> Saving</>}
            {saveState === 'saved' && <><Check size={13} /> Saved locally</>}
            {saveState === 'error' && <><AlertCircle size={13} /> Save failed</>}
            {saveState === 'idle' && <><span className="local-dot" /> Local</>}
          </span>
          <button className={`icon-button copy-button ${copyState}`} onClick={copyMarkdown} title="Copy page as Markdown">
            {copyState === 'copied' ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <div className="page-options-wrap" ref={moreMenuRef}>
            <button className={`icon-button ${moreOpen ? 'is-active' : ''}`} title="More page options" onClick={() => setMoreOpen(value => !value)}><MoreHorizontal size={17} /></button>
            {moreOpen && (
              <div className="page-options-menu">
                <p>Page options</p>
                <button onClick={() => setPageWide(value => !value)}><PanelTop size={15} /><span>Full width</span><i className={pageWide ? 'is-on' : ''} /></button>
                <button onClick={cycleFont}><Type size={15} /><span>Typography</span><small>{pageFont}</small></button>
                <button onClick={handleAddImage}><ImagePlus size={15} /><span>Add image</span></button>
                <hr />
                <button onClick={downloadMarkdown}><Download size={15} /><span>Download Markdown</span></button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor area */}
      <div ref={scrollRef} className="editor-scroll flex-1 overflow-y-auto flex justify-center items-start">
        <article className={`editor-page page-font-${pageFont} ${pageWide ? 'is-wide' : ''}`}>
          <div className="page-accent" />
          {/* Page title */}
          <div
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Untitled"
            className="page-title-input"
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
            className="blocks-canvas relative pl-8 min-h-[45vh]"
            onClick={e => {
              if (!e.target.closest('[contenteditable], .block-handle, button')) {
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
                onIndent={handleIndent}
                onToggleTodo={handleToggleTodo}
                onDuplicate={handleDuplicate}
                onMove={handleMove}
                onAddAfter={handleAddAfter}
                onPickImage={handlePickImage}
                rootHandle={rootHandle}
              />
            ))}
          </div>
        </article>
      </div>

      {/* Slash menu */}
      {slashMenu && (
        <SlashMenu
          targetRect={slashMenu.rect}
          query={slashMenu.query}
          onSelect={handleSlashSelect}
          onClose={() => {
            dismissedSlashIds.current.add(slashMenu.blockId);
            setSlashMenu(null);
          }}
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

      <input ref={imageInputRef} className="sr-only" type="file" accept="image/*" onChange={handleImageSelected} />
      {copyState !== 'idle' && (
        <div className={`editor-toast toast-${copyState}`} role="status">
          {copyState === 'copied' ? <><Check size={15} /> Markdown copied</> : <><AlertCircle size={15} /> Copy failed</>}
        </div>
      )}
    </div>
  );
}
