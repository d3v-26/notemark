import { useState, useRef, useEffect } from 'react';
import { FolderOpen, Plus, Search, ChevronLeft } from 'lucide-react';
import PageTree from './PageTree';

export default function AppSidebar({
  rootHandle, pages, currentPage,
  onPageOpen, onPageDelete, onPageRename, onNewPage, onChangeFolder,
  isOpen, onToggle,
}) {
  const [filter, setFilter] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');
  const newInputRef = useRef(null);

  useEffect(() => {
    if (showNewInput) newInputRef.current?.focus();
  }, [showNewInput]);

  function handleNewKeyDown(e) {
    if (e.key === 'Enter') finishNew();
    if (e.key === 'Escape') { setShowNewInput(false); setNewName(''); }
  }

  async function finishNew() {
    const name = newName.trim();
    setShowNewInput(false);
    setNewName('');
    if (!name) return;
    await onNewPage(name);
  }

  const NIcon = (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold flex-shrink-0 border"
      style={{
        background: 'rgba(124,58,237,0.12)',
        color: '#a78bfa',
        borderColor: 'rgba(124,58,237,0.2)',
      }}
    >
      N
    </div>
  );

  return (
    <aside
      className="flex flex-col border-r border-border overflow-hidden transition-[width] duration-200 ease-in-out"
      style={{ width: isOpen ? 256 : 44, minWidth: isOpen ? 256 : 44, background: '#161616' }}
    >
      {isOpen ? (
      /* ── Expanded ── */
      <div style={{ width: 256 }} className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 pt-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {NIcon}
          <span className="text-[13.5px] font-semibold truncate text-foreground">
            {rootHandle?.name || 'Notes'}
          </span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            title="Change folder"
            onClick={onChangeFolder}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:bg-secondary hover:text-foreground transition-colors"
          >
            <FolderOpen size={14} />
          </button>
          <button
            title="New page"
            onClick={() => setShowNewInput(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Plus size={14} />
          </button>
          <button
            title="Collapse sidebar"
            onClick={onToggle}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/40 hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
        </div>
      </div>

      {/* Search — relative wrapper is scoped to the input so top-1/2 aligns correctly */}
      <div className="px-2.5 pb-2">
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search pages..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-transparent rounded-full text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* New page inline input */}
      {showNewInput && (
        <div className="px-2 pb-1">
          <input
            ref={newInputRef}
            type="text"
            placeholder="Page name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleNewKeyDown}
            onBlur={finishNew}
            className="w-full px-2 py-1.5 bg-secondary border border-primary/60 rounded-md text-[13px] text-foreground outline-none ring-1 ring-primary/30"
          />
        </div>
      )}

      {/* Page tree */}
      <PageTree
        pages={pages}
        currentPage={currentPage}
        rootHandle={rootHandle}
        onPageOpen={onPageOpen}
        onPageDelete={onPageDelete}
        onPageRename={onPageRename}
        filter={filter}
      />
      </div>
      ) : (
      /* ── Collapsed strip ── */
      <div className="flex flex-col items-center pt-3">
        <button title="Expand sidebar" onClick={onToggle} className="rounded-lg transition-opacity opacity-80 hover:opacity-100">
          {NIcon}
        </button>
      </div>
      )}
    </aside>
  );
}
