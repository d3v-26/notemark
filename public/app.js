// ── Icons ──

const icons = {
  chevronRight: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevronDown:  `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  fileDot:      `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="1.5" fill="currentColor" opacity="0.5"/></svg>`,
  x:            `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  grip:         `<svg width="10" height="12" viewBox="0 0 10 12" fill="none"><circle cx="3" cy="2.5" r="1" fill="currentColor"/><circle cx="7" cy="2.5" r="1" fill="currentColor"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="7" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="9.5" r="1" fill="currentColor"/><circle cx="7" cy="9.5" r="1" fill="currentColor"/></svg>`,
};

// ── State ──

let currentPage = null;
let pages = [];
let saveTimeout = null;
let rootDirHandle = null;
let storedHandle = null; // remembered handle for reconnection

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const pageTree = $('#pageTree');
const blocksEl = $('#blocks');
const pageTitle = $('#pageTitle');
const editorContainer = $('#editorContainer');
const emptyState = $('#emptyState');
const slashMenu = $('#slashMenu');
const contextMenu = $('#contextMenu');
const searchInput = $('#searchInput');
const newPageBtn = $('#newPageBtn');
const folderPickerScreen = $('#folderPickerScreen');
const openFolderBtn = $('#openFolderBtn');
const changeFolderBtn = $('#changeFolderBtn');

// ── IndexedDB helpers ──

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('nc', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(handle) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, 'root');
    tx.oncomplete = resolve;
  });
}

async function loadHandle() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get('root');
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
}

// ── File System helpers ──

async function buildTree(dirHandle, prefix = '') {
  const entries = [];
  for await (const [name, handle] of dirHandle.entries()) {
    const relPath = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'directory') {
      entries.push({
        name,
        path: relPath,
        type: 'folder',
        children: await buildTree(handle, relPath),
      });
    } else if (name.endsWith('.md')) {
      entries.push({ name: name.replace(/\.md$/, ''), path: relPath, type: 'page' });
    }
  }
  entries.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
  return entries;
}

async function resolveFileHandle(pagePath, create = false) {
  const parts = pagePath.split('/');
  let dir = rootDirHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create });
  }
  return { dir, handle: await dir.getFileHandle(parts[parts.length - 1], { create }) };
}

async function readFilePage(pagePath) {
  const { handle } = await resolveFileHandle(pagePath);
  const file = await handle.getFile();
  const content = await file.text();
  const name = pagePath.split('/').pop().replace(/\.md$/, '');
  return { name, path: pagePath, content };
}

async function writeFilePage(pagePath, content) {
  const { handle } = await resolveFileHandle(pagePath, true);
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function deleteFilePage(pagePath) {
  const parts = pagePath.split('/');
  let dir = rootDirHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i]);
  }
  await dir.removeEntry(parts[parts.length - 1], { recursive: true });
}

// ── Folder picker ──

function updateWorkspaceName() {
  const el = document.querySelector('.workspace-name');
  if (el && rootDirHandle) el.textContent = rootDirHandle.name;
}

async function openFolder(forceNew = false) {
  let handle = null;

  if (!forceNew && storedHandle) {
    try {
      const perm = await storedHandle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') handle = storedHandle;
    } catch (e) { /* ignore, fall through to picker */ }
  }

  if (!handle) {
    try {
      handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
      return;
    }
  }

  rootDirHandle = handle;
  storedHandle = handle;
  await saveHandle(handle);
  updateWorkspaceName();
  folderPickerScreen.classList.add('hidden');
  await loadPages();
}

openFolderBtn.addEventListener('click', () => openFolder());
changeFolderBtn.addEventListener('click', () => openFolder(true));

// ── Load pages ──

async function loadPages() {
  pages = await buildTree(rootDirHandle);

  // Create a welcome page if the folder is empty
  if (pages.length === 0) {
    await writeFilePage('Welcome.md', '# Welcome to NC\n\nStart editing this page or create a new one from the sidebar.\n');
    pages = await buildTree(rootDirHandle);
  }

  renderTree(pages);
}

// ── Sidebar tree ──

function renderTree(items, container, depth = 0) {
  if (!container) container = pageTree;
  container.innerHTML = '';
  const filter = searchInput.value.toLowerCase();

  for (const item of items) {
    if (filter && item.type === 'page' && !item.name.toLowerCase().includes(filter)) continue;

    const div = document.createElement('div');
    div.className = 'tree-item' + (currentPage === item.path ? ' active' : '');
    div.style.paddingLeft = (8 + depth * 14) + 'px';

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.innerHTML = item.type === 'folder' ? icons.chevronDown : icons.fileDot;
    div.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'tree-label';
    label.textContent = item.name;
    div.appendChild(label);

    if (item.type === 'page') {
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = icons.x;
      delBtn.title = 'Delete';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDelete(item);
      });
      div.appendChild(delBtn);
    }

    div.addEventListener('click', () => {
      if (item.type === 'page') openPage(item.path);
      else {
        // Toggle folder
        const children = div.nextElementSibling;
        if (children) children.style.display = children.style.display === 'none' ? '' : 'none';
        icon.innerHTML = children && children.style.display === 'none' ? icons.chevronRight : icons.chevronDown;
      }
    });

    div.addEventListener('contextmenu', (e) => {
      if (item.type !== 'page') return;
      e.preventDefault();
      showContextMenu(e, item);
    });

    container.appendChild(div);

    if (item.children) {
      const childContainer = document.createElement('div');
      childContainer.className = 'tree-folder-children';
      renderTree(item.children, childContainer, depth + 1);
      container.appendChild(childContainer);
    }
  }
}

// ── Page operations ──

async function openPage(pagePath) {
  // save current first
  if (currentPage) await savePage();

  const data = await readFilePage(pagePath);
  currentPage = pagePath;

  editorContainer.classList.add('visible');
  emptyState.classList.add('hidden');

  pageTitle.textContent = '';
  loadBlocks(data.content, data.name);

  // Re-render tree to update active state
  renderTree(pages);
}

async function savePage() {
  if (!currentPage) return;
  const content = serializeBlocks();
  await writeFilePage(currentPage, content);
}

function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(savePage, 800);
}

newPageBtn.addEventListener('click', () => {
  // Create an inline input in the sidebar
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-rename';
  input.placeholder = 'Page name';
  pageTree.prepend(input);
  input.focus();

  async function finish() {
    const name = input.value.trim();
    input.remove();
    if (!name) return;
    const fileName = name + '.md';
    await writeFilePage(fileName, `# ${name}\n`);
    await loadPages();
    openPage(fileName);
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish();
    if (e.key === 'Escape') input.remove();
  });
  input.addEventListener('blur', finish);
});

searchInput.addEventListener('input', () => renderTree(pages));

// ── Confirm modal ──

const confirmModal = $('#confirmModal');
const confirmTitle = $('#confirmTitle');
const confirmMsg = $('#confirmMsg');
const confirmOk = $('#confirmOk');
const confirmCancel = $('#confirmCancel');

function showConfirm(title, msg) {
  confirmTitle.textContent = title;
  confirmMsg.textContent = msg;
  confirmModal.classList.remove('hidden');
  return new Promise((resolve) => {
    function cleanup(result) {
      confirmModal.classList.add('hidden');
      confirmOk.removeEventListener('click', onOk);
      confirmCancel.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }
    confirmOk.addEventListener('click', onOk);
    confirmCancel.addEventListener('click', onCancel);
  });
}

async function confirmDelete(item) {
  const ok = await showConfirm(`Delete "${item.name}"?`, 'This action cannot be undone.');
  if (!ok) return;
  await deleteFilePage(item.path);
  if (currentPage === item.path) {
    currentPage = null;
    editorContainer.classList.remove('visible');
    emptyState.classList.remove('hidden');
  }
  await loadPages();
}

// ── Context menu ──

let contextTarget = null;

function showContextMenu(e, item) {
  contextTarget = item;
  contextMenu.classList.remove('hidden');
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';
}

document.addEventListener('click', () => contextMenu.classList.add('hidden'));

contextMenu.addEventListener('click', async (e) => {
  const action = e.target.closest('.context-menu-item')?.dataset.action;
  if (!contextTarget) return;

  if (action === 'delete') {
    contextMenu.classList.add('hidden');
    await confirmDelete(contextTarget);
    return;
  } else if (action === 'rename') {
    const newName = prompt('New name:', contextTarget.name);
    if (!newName || !newName.trim()) return;
    const dir = contextTarget.path.substring(0, contextTarget.path.lastIndexOf('/') + 1);
    const newPath = dir + newName.trim() + '.md';
    const data = await readFilePage(contextTarget.path);
    await writeFilePage(newPath, data.content);
    await deleteFilePage(contextTarget.path);
    if (currentPage === contextTarget.path) currentPage = newPath;
    await loadPages();
  }
  contextMenu.classList.add('hidden');
});

// ── Block editor ──

function getBlockType(block) {
  return block.dataset.type;
}

function getNextOlIndex(block) {
  let idx = 1;
  let prev = block.previousElementSibling;
  while (prev && getBlockType(prev) === 'ol') {
    idx++;
    prev = prev.previousElementSibling;
  }
  return idx + 1;
}

function createBlock(type = 'p', text = '', index = 1) {
  const block = document.createElement('div');
  block.className = 'block';
  block.dataset.type = type;
  block.draggable = true;

  const handle = document.createElement('div');
  handle.className = 'block-handle';
  handle.innerHTML = icons.grip;

  const content = document.createElement('div');
  content.className = 'block-content';
  content.contentEditable = type !== 'hr';
  content.textContent = text;
  if (type === 'ol') content.dataset.index = index;

  // Gutter for list markers
  const gutter = document.createElement('div');
  gutter.className = 'block-gutter';

  function updateGutter() {
    const t = getBlockType(block);
    if (t !== 'ul' && t !== 'ol') { gutter.textContent = ''; return; }
    const lines = content.innerText.split('\n');
    // Count lines but ignore a single trailing empty line (browser artifact)
    const lineCount = (lines.length > 1 && lines[lines.length - 1] === '') ? lines.length - 1 : lines.length;
    const idx = t === 'ol' ? (parseInt(content.dataset.index) || 1) : 0;
    gutter.innerHTML = Array.from({ length: lineCount }, (_, i) =>
      `<div class="gutter-mark">${t === 'ul' ? '•' : (idx + i) + '.'}</div>`
    ).join('');
  }

  block.appendChild(handle);
  block.appendChild(gutter);
  block.appendChild(content);

  block._updateGutter = updateGutter;
  if (type === 'ul' || type === 'ol') updateGutter();

  // Events
  content.addEventListener('input', () => { updateGutter(); scheduleSave(); });

  content.addEventListener('keydown', (e) => {
    const currentType = getBlockType(block);

    if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter: extend block for code/lists (default contenteditable newline)
      if (currentType === 'code' || currentType === 'ul' || currentType === 'ol') return;
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Enter: always create a new block (except code where Enter is natural)
      if (currentType === 'code') return;
      e.preventDefault();
      const newBlock = createBlock('p');
      block.after(newBlock);
      newBlock.querySelector('.block-content').focus();
      scheduleSave();
    } else if (e.key === 'Backspace' && content.textContent.trim() === '') {
      e.preventDefault();
      const prev = block.previousElementSibling;
      block.remove();
      if (prev) {
        const prevContent = prev.querySelector('.block-content');
        if (prevContent) {
          prevContent.focus();
          // Move cursor to end
          const range = document.createRange();
          range.selectNodeContents(prevContent);
          range.collapse(false);
          window.getSelection().removeAllRanges();
          window.getSelection().addRange(range);
        }
      }
      scheduleSave();
    } else if (e.key === 'ArrowUp') {
      const prev = block.previousElementSibling;
      if (prev) prev.querySelector('.block-content')?.focus();
    } else if (e.key === 'ArrowDown') {
      const next = block.nextElementSibling;
      if (next) next.querySelector('.block-content')?.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // In code blocks insert actual tab
      if (currentType === 'code') {
        document.execCommand('insertText', false, '  ');
      }
    }
  });

  content.addEventListener('input', (e) => {
    // Detect slash command
    const text = content.textContent;
    if (text === '/') {
      showSlashMenu(content);
    } else {
      slashMenu.classList.add('hidden');
    }
  });

  // Drag and drop
  block.addEventListener('dragstart', (e) => {
    block.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  block.addEventListener('dragend', () => {
    block.classList.remove('dragging');
    $$('.block.drag-over').forEach(b => b.classList.remove('drag-over'));
    scheduleSave();
  });
  block.addEventListener('dragover', (e) => {
    e.preventDefault();
    const dragging = $('.block.dragging');
    if (dragging === block) return;
    block.classList.add('drag-over');
  });
  block.addEventListener('dragleave', () => block.classList.remove('drag-over'));
  block.addEventListener('drop', (e) => {
    e.preventDefault();
    block.classList.remove('drag-over');
    const dragging = $('.block.dragging');
    if (!dragging || dragging === block) return;
    blocksEl.insertBefore(dragging, block);
  });

  return block;
}

function showSlashMenu(contentEl) {
  const rect = contentEl.getBoundingClientRect();
  slashMenu.style.left = rect.left + 'px';
  slashMenu.style.top = (rect.bottom + 4) + 'px';
  slashMenu.classList.remove('hidden');
  slashMenu._target = contentEl;

  // Reset selection
  $$('.slash-menu-item').forEach((item, i) => {
    item.classList.toggle('selected', i === 0);
  });
}

slashMenu.addEventListener('click', (e) => {
  const item = e.target.closest('.slash-menu-item');
  const type = item?.dataset.type;
  if (!type) return;
  applySlashCommand(type);
});

function applySlashCommand(type) {
  const contentEl = slashMenu._target;
  if (!contentEl) return;
  const block = contentEl.closest('.block');

  contentEl.textContent = '';
  block.dataset.type = type;

  if (type === 'ol') {
    // Set index based on preceding ol blocks
    let idx = 1;
    let prev = block.previousElementSibling;
    while (prev && getBlockType(prev) === 'ol') { idx++; prev = prev.previousElementSibling; }
    contentEl.dataset.index = idx;
  }

  if (type === 'hr') {
    contentEl.contentEditable = false;
    // Only add a block after if there isn't one already
    if (!block.nextElementSibling) {
      const newBlock = createBlock('p');
      block.after(newBlock);
      newBlock.querySelector('.block-content').focus();
    } else {
      block.nextElementSibling.querySelector('.block-content')?.focus();
    }
  } else {
    contentEl.contentEditable = true;
    contentEl.focus();
  }

  if (block._updateGutter) block._updateGutter();
  slashMenu.classList.add('hidden');
  scheduleSave();
}

// Keyboard navigation in slash menu
document.addEventListener('keydown', (e) => {
  if (slashMenu.classList.contains('hidden')) return;

  const items = [...$$('.slash-menu-item')];
  const current = items.findIndex(i => i.classList.contains('selected'));

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    items[current]?.classList.remove('selected');
    items[(current + 1) % items.length]?.classList.add('selected');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    items[current]?.classList.remove('selected');
    items[(current - 1 + items.length) % items.length]?.classList.add('selected');
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const selected = items[current];
    if (selected) applySlashCommand(selected.dataset.type);
  } else if (e.key === 'Escape') {
    slashMenu.classList.add('hidden');
  }
});

// Close slash menu on click outside
document.addEventListener('click', (e) => {
  if (!slashMenu.contains(e.target)) slashMenu.classList.add('hidden');
});

// ── Markdown parsing / serializing ──

function loadBlocks(markdown, fallbackName) {
  blocksEl.innerHTML = '';
  const lines = markdown.split('\n');
  let olIndex = 1;
  let inCode = false;
  let codeContent = '';
  let titleSet = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block fencing
    if (line.startsWith('```')) {
      if (inCode) {
        // End code block
        blocksEl.appendChild(createBlock('code', codeContent.trimEnd()));
        codeContent = '';
        inCode = false;
      } else {
        inCode = true;
        codeContent = '';
      }
      continue;
    }
    if (inCode) {
      codeContent += (codeContent ? '\n' : '') + line;
      continue;
    }

    // Skip empty lines but keep flow
    if (line.trim() === '') {
      olIndex = 1;
      continue;
    }

    // Headings — first # becomes the page title
    if (line.startsWith('# ') && !line.startsWith('## ') && !titleSet) {
      pageTitle.textContent = line.slice(2);
      titleSet = true;
    } else if (line.startsWith('### ')) {
      blocksEl.appendChild(createBlock('h3', line.slice(4)));
    } else if (line.startsWith('## ')) {
      blocksEl.appendChild(createBlock('h2', line.slice(3)));
    } else if (line.startsWith('# ')) {
      blocksEl.appendChild(createBlock('h1', line.slice(2)));
    }
    // Lists — merge consecutive items into one block
    else if (line.match(/^[-*] /)) {
      const lastBlock = blocksEl.lastElementChild;
      if (lastBlock && getBlockType(lastBlock) === 'ul') {
        const c = lastBlock.querySelector('.block-content');
        c.textContent += '\n' + line.slice(2);
      } else {
        blocksEl.appendChild(createBlock('ul', line.slice(2)));
      }
    } else if (line.match(/^\d+\. /)) {
      const text = line.replace(/^\d+\.\s/, '');
      const lastBlock = blocksEl.lastElementChild;
      if (lastBlock && getBlockType(lastBlock) === 'ol') {
        const c = lastBlock.querySelector('.block-content');
        c.textContent += '\n' + text;
      } else {
        blocksEl.appendChild(createBlock('ol', text, olIndex));
      }
      olIndex++;
    }
    // Quote
    else if (line.startsWith('> ')) {
      blocksEl.appendChild(createBlock('blockquote', line.slice(2)));
    }
    // Divider
    else if (line.match(/^---+$/)) {
      blocksEl.appendChild(createBlock('hr'));
    }
    // Paragraph
    else {
      blocksEl.appendChild(createBlock('p', line));
    }
  }

  // Set fallback title if none extracted
  if (!titleSet && fallbackName) {
    pageTitle.textContent = fallbackName;
  }

  // Always have at least one empty block
  if (blocksEl.children.length === 0) {
    blocksEl.appendChild(createBlock('p'));
  }

  // Show hint only on the last block if it's empty
  const lastBlock = blocksEl.lastElementChild;
  if (lastBlock) {
    const lastContent = lastBlock.querySelector('.block-content');
    if (lastContent && lastContent.textContent === '') {
      lastContent.classList.add('show-hint');
    }
  }
}

function serializeBlocks() {
  const blocks = [...blocksEl.querySelectorAll('.block')];
  let titleText = pageTitle.textContent.trim();
  let lines = [];

  if (titleText) lines.push('# ' + titleText);

  let olIndex = 1;
  for (const block of blocks) {
    const type = block.dataset.type;
    const text = block.querySelector('.block-content')?.textContent || '';

    switch (type) {
      case 'h1': lines.push('# ' + text); break;
      case 'h2': lines.push('## ' + text); break;
      case 'h3': lines.push('### ' + text); break;
      case 'ul': text.split('\n').forEach(l => lines.push('- ' + l)); break;
      case 'ol': text.split('\n').forEach(l => lines.push((olIndex++) + '. ' + l)); break;
      case 'blockquote': lines.push('> ' + text); break;
      case 'code': lines.push('```\n' + text + '\n```'); break;
      case 'hr': lines.push('---'); break;
      default: lines.push(text); break;
    }
  }

  return lines.join('\n') + '\n';
}

// ── Page title ──

pageTitle.addEventListener('input', () => {
  scheduleSave();
});

pageTitle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const firstBlock = blocksEl.querySelector('.block-content');
    if (firstBlock) firstBlock.focus();
  }
});

// ── Init ──

async function init() {
  if (!('showDirectoryPicker' in window)) {
    openFolderBtn.textContent = 'Browser not supported';
    openFolderBtn.disabled = true;
    folderPickerScreen.querySelector('p').textContent =
      'NC requires Chrome or Edge (desktop). The File System Access API is not available in this browser.';
    folderPickerScreen.classList.remove('hidden');
    return;
  }

  storedHandle = await loadHandle();

  if (storedHandle) {
    try {
      const perm = await storedHandle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        rootDirHandle = storedHandle;
        updateWorkspaceName();
        await loadPages();
        return;
      }
      // Permission needs to be re-requested via user gesture — show the screen
      openFolderBtn.textContent = 'Reconnect Folder';
    } catch (e) {
      storedHandle = null;
    }
  }

  folderPickerScreen.classList.remove('hidden');
}

init();
