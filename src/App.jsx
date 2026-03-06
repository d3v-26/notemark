import { useState, useEffect, useRef } from 'react';
import { Plus, Search } from 'lucide-react';
import { loadHandle, saveHandle, buildTree, writeFilePage } from './fs';
import FolderPicker from './components/FolderPicker';
import AppSidebar from './components/AppSidebar';
import BlockEditor from './components/BlockEditor';
import EmptyState from './components/EmptyState';
import SearchDialog from './components/SearchDialog';

export default function App() {
  const [rootHandle, setRootHandle] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(null);
  const [storedHandle, setStoredHandle] = useState(null);
  const [reconnect, setReconnect] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [floatingNew, setFloatingNew] = useState(false);
  const [floatingNewName, setFloatingNewName] = useState('');
  const floatingInputRef = useRef(null);

  // On mount: try to load handle from IndexedDB
  useEffect(() => {
    async function init() {
      const handle = await loadHandle();
      if (!handle) return;
      setStoredHandle(handle);
      try {
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          setRootHandle(handle);
        } else {
          setReconnect(true);
        }
      } catch {
        setStoredHandle(null);
      }
    }
    init();
  }, []);

  // Load pages whenever rootHandle is set
  useEffect(() => {
    if (!rootHandle) return;
    loadPages(rootHandle);
  }, [rootHandle]); // eslint-disable-line react-hooks/exhaustive-deps

  function firstPagePath(tree) {
    for (const node of tree) {
      if (node.type === 'page') return node.path;
      if (node.type === 'folder') {
        const found = firstPagePath(node.children || []);
        if (found) return found;
      }
    }
    return null;
  }

  function flatPaths(tree) {
    const paths = [];
    for (const node of tree) {
      if (node.type === 'page') paths.push(node.path);
      if (node.children) paths.push(...flatPaths(node.children));
    }
    return paths;
  }

  useEffect(() => {
    if (currentPage) localStorage.setItem('nc:currentPage', currentPage);
  }, [currentPage]);

  async function loadPages(handle) {
    const rh = handle || rootHandle;
    let tree = await buildTree(rh);
    if (tree.length === 0) {
      const welcome = [
        '# Welcome to NC',
        '',
        'NC is a local-first note-taking app. Your notes are plain markdown files stored on your device.',
        '',
        '## Getting started',
        '',
        '- Click **New page** in the sidebar to create a note',
        '- Type `/` in any block to open the command menu',
        '- Press `Escape` to exit a code block',
        '- Drag the ⠿ handle to reorder blocks',
        '- Use `Cmd+K` to search your notes',
        '',
        '## Block types',
        '',
        '| Shortcut | Block |',
        '|----------|-------|',
        '| `# `     | Heading 1 |',
        '| `## `    | Heading 2 |',
        '| `### `   | Heading 3 |',
        '| `- `     | Bullet list |',
        '| `1. `    | Numbered list |',
        '| `> `     | Quote |',
        '| ` ``` `  | Code block |',
        '| `---`    | Divider |',
        '',
        '---',
        '',
        'Happy writing!',
      ].join('\n') + '\n';
      await writeFilePage(rh, 'Welcome.md', welcome);
      tree = await buildTree(rh);
    }
    setPages(tree);
    setCurrentPage(prev => {
      if (prev) return prev;
      const saved = localStorage.getItem('nc:currentPage');
      const allPaths = flatPaths(tree);
      if (saved && allPaths.includes(saved)) return saved;
      return firstPagePath(tree);
    });
  }

  async function handleOpenFolder(forceNew = false) {
    let handle = null;

    if (!forceNew && storedHandle) {
      try {
        const perm = await storedHandle.requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') handle = storedHandle;
      } catch {}
    }

    if (!handle) {
      try {
        handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
        return;
      }
    }

    await saveHandle(handle);
    setStoredHandle(handle);
    setRootHandle(handle);
    setReconnect(false);
  }

  async function handleNewPage(name) {
    const fileName = name + '.md';
    await writeFilePage(rootHandle, fileName, `# ${name}\n`);
    await loadPages(rootHandle);
    setCurrentPage(fileName);
  }

  function handlePageDelete(pagePath) {
    if (currentPage === pagePath) setCurrentPage(null);
    loadPages(rootHandle);
  }

  useEffect(() => {
    if (floatingNew) floatingInputRef.current?.focus();
  }, [floatingNew]);

  async function handleFloatingNewPage() {
    const name = floatingNewName.trim();
    setFloatingNew(false);
    setFloatingNewName('');
    if (!name) return;
    await handleNewPage(name);
  }

  function handlePageRename(oldPath, newPath) {
    if (currentPage === oldPath) setCurrentPage(newPath);
    loadPages(rootHandle);
  }

  if (!rootHandle) {
    return (
      <FolderPicker
        onOpen={handleOpenFolder}
        reconnect={reconnect}
        storedName={storedHandle?.name}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        rootHandle={rootHandle}
        pages={pages}
        currentPage={currentPage}
        onPageOpen={setCurrentPage}
        onPageDelete={handlePageDelete}
        onPageRename={handlePageRename}
        onNewPage={handleNewPage}
        onChangeFolder={() => handleOpenFolder(true)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {currentPage ? (
          <BlockEditor
            key={currentPage}
            rootHandle={rootHandle}
            currentPage={currentPage}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(o => !o)}
          />
        ) : (
          <EmptyState />
        )}
      </main>

      <SearchDialog pages={pages} onPageOpen={setCurrentPage} />

      {/* Floating right actions */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {floatingNew && (
          <input
            ref={floatingInputRef}
            type="text"
            placeholder="Page name…"
            value={floatingNewName}
            onChange={e => setFloatingNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleFloatingNewPage();
              if (e.key === 'Escape') { setFloatingNew(false); setFloatingNewName(''); }
            }}
            className="w-44 px-3 py-1.5 bg-popover border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none shadow-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          />
        )}
        <div className="flex flex-col items-center gap-2">
          <button
            title="Search (⌘K)"
            onClick={() => window.dispatchEvent(new CustomEvent('nc:open-search'))}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-muted-foreground hover:text-foreground shadow-md transition-colors"
          >
            <Search size={14} />
          </button>
          <button
            title="New page"
            onClick={() => { setFloatingNew(p => !p); setFloatingNewName(''); }}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all"
            style={{ background: 'rgba(124,58,237,0.85)', color: '#fff' }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
