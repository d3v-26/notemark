import { useState, useEffect } from 'react';
import { useCallback } from 'react';
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
  const [theme, setTheme] = useState(() => localStorage.getItem('notemark:theme') || 'light');
  const [createRequested, setCreateRequested] = useState(0);

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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('notemark:theme', theme);
  }, [theme]);

  useEffect(() => {
    const onResize = () => setSidebarOpen(window.innerWidth >= 760);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
        '# Welcome to Notemark',
        '',
        'Notemark is a local-first writing app. Your notes are plain Markdown files stored on your device.',
        '',
        '## Getting started',
        '',
        '- Click **New page** in the sidebar to create a note',
        '- Type `/` and a block name to filter the command menu',
        '- Press `Tab` and `Shift+Tab` to nest and unnest list items',
        '- Type `[] ` to start a to-do, then `Cmd+Enter` to toggle it',
        '- Press `Escape` to exit a code block',
        '- Drag the ⠿ handle to reorder blocks',
        '- Click a block handle to duplicate, move, or delete it',
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
        '| `[] `    | To-do |',
        '| `" `     | Quote |',
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

  const handleNewPage = useCallback(async (name) => {
    const safeName = name.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ');
    if (!safeName) return;
    const existing = new Set(flatPaths(pages));
    let fileName = safeName + '.md';
    let suffix = 2;
    while (existing.has(fileName)) fileName = `${safeName} ${suffix++}.md`;
    await writeFilePage(rootHandle, fileName, `# ${name}\n`);
    await loadPages(rootHandle);
    setCurrentPage(fileName);
    if (window.innerWidth < 760) setSidebarOpen(false);
  }, [pages, rootHandle]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePageDelete(pagePath) {
    if (currentPage === pagePath) setCurrentPage(null);
    loadPages(rootHandle);
  }

  useEffect(() => {
    function handleShortcuts(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setSidebarOpen(true);
        setCreateRequested(value => value + 1);
      }
    }
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, []);

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
    <div className="app-shell flex h-[100dvh] overflow-hidden bg-background">
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
        />
      )}
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
        theme={theme}
        onToggleTheme={() => setTheme(value => value === 'dark' ? 'light' : 'dark')}
        createRequested={createRequested}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {currentPage ? (
          <BlockEditor
            key={currentPage}
            rootHandle={rootHandle}
            currentPage={currentPage}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(o => !o)}
            theme={theme}
          />
        ) : (
          <EmptyState
            onCreate={() => { setSidebarOpen(true); setCreateRequested(value => value + 1); }}
            onSearch={() => window.dispatchEvent(new CustomEvent('nc:open-search'))}
          />
        )}
      </main>

      <SearchDialog rootHandle={rootHandle} pages={pages} onPageOpen={(path) => {
        setCurrentPage(path);
        if (window.innerWidth < 760) setSidebarOpen(false);
      }} />
    </div>
  );
}
