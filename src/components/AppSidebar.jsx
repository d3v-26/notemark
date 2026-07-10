import { useState, useRef, useEffect } from 'react';
import {
  FolderOpen, Plus, Search, PanelLeftClose, PanelLeftOpen,
  Moon, Sun, HardDrive, Command,
} from 'lucide-react';
import PageTree from './PageTree';

function Mark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function AppSidebar({
  rootHandle, pages, currentPage,
  onPageOpen, onPageDelete, onPageRename, onNewPage, onChangeFolder,
  isOpen, onToggle, theme, onToggleTheme, createRequested,
}) {
  const [filter, setFilter] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');
  const newInputRef = useRef(null);

  useEffect(() => {
    if (showNewInput) newInputRef.current?.focus();
  }, [showNewInput]);

  useEffect(() => {
    if (createRequested) setShowNewInput(true);
  }, [createRequested]);

  function handleNewKeyDown(e) {
    if (e.key === 'Enter') finishNew();
    if (e.key === 'Escape') { setShowNewInput(false); setNewName(''); }
  }

  async function finishNew() {
    const name = newName.trim();
    setShowNewInput(false);
    setNewName('');
    if (name) await onNewPage(name);
  }

  const pageCount = pages.reduce(function count(total, item) {
    return total + (item.type === 'page' ? 1 : (item.children || []).reduce(count, 0));
  }, 0);

  return (
    <aside className={`app-sidebar ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      {isOpen ? (
        <div className="flex flex-col flex-1 min-h-0 w-[288px]">
          <header className="sidebar-header">
            <div className="flex items-center gap-3 min-w-0">
              <Mark />
              <div className="min-w-0">
                <p className="sidebar-kicker">NOTEMARK</p>
                <p className="sidebar-workspace">{rootHandle?.name || 'My notes'}</p>
              </div>
            </div>
            <button className="icon-button" title="Collapse sidebar" onClick={onToggle}>
              <PanelLeftClose size={17} />
            </button>
          </header>

          <div className="px-3 pt-3">
            <button className="new-page-button" onClick={() => setShowNewInput(true)}>
              <Plus size={16} strokeWidth={2.4} />
              <span>New page</span>
              <kbd>⌘N</kbd>
            </button>
          </div>

          <div className="px-3 pt-3 pb-2">
            <div className="sidebar-search">
              <Search size={14} />
              <input
                type="search"
                aria-label="Filter pages"
                placeholder="Filter pages"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
              {!filter && <kbd>⌘K</kbd>}
            </div>
          </div>

          {showNewInput && (
            <div className="px-3 pb-2">
              <div className="new-page-input-wrap">
                <span className="new-page-dot" />
                <input
                  ref={newInputRef}
                  type="text"
                  placeholder="Name this page…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={handleNewKeyDown}
                  onBlur={finishNew}
                />
              </div>
            </div>
          )}

          <div className="sidebar-section-label">
            <span>Library</span>
            <span>{pageCount}</span>
          </div>

          <PageTree
            pages={pages}
            currentPage={currentPage}
            rootHandle={rootHandle}
            onPageOpen={onPageOpen}
            onPageDelete={onPageDelete}
            onPageRename={onPageRename}
            filter={filter}
          />

          <footer className="sidebar-footer">
            <button onClick={onChangeFolder} title="Change folder">
              <HardDrive size={15} />
              <span>Local workspace</span>
              <span className="status-dot" />
            </button>
            <div className="flex items-center gap-1">
              <button className="icon-button" onClick={onToggleTheme} title={`Use ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button className="icon-button" onClick={() => window.dispatchEvent(new CustomEvent('nc:open-search'))} title="Command search">
                <Command size={16} />
              </button>
            </div>
          </footer>
        </div>
      ) : (
        <div className="collapsed-sidebar">
          <button title="Expand sidebar" onClick={onToggle}><Mark /></button>
          <button className="icon-button mt-4" title="Expand sidebar" onClick={onToggle}>
            <PanelLeftOpen size={17} />
          </button>
        </div>
      )}
    </aside>
  );
}
