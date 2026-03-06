// ── IndexedDB helpers ──

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('nc', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHandle(handle) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, 'root');
    tx.oncomplete = resolve;
  });
}

export async function loadHandle() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get('root');
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
}

// ── File System helpers ──

export async function buildTree(dirHandle, prefix = '') {
  const entries = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.')) continue;
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

async function resolveFileHandle(rootHandle, pagePath, create = false) {
  const parts = pagePath.split('/');
  let dir = rootHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create });
  }
  return { dir, handle: await dir.getFileHandle(parts[parts.length - 1], { create }) };
}

export async function readFilePage(rootHandle, pagePath) {
  const { handle } = await resolveFileHandle(rootHandle, pagePath);
  const file = await handle.getFile();
  const content = await file.text();
  const name = pagePath.split('/').pop().replace(/\.md$/, '');
  return { name, path: pagePath, content };
}

export async function writeFilePage(rootHandle, pagePath, content) {
  const { handle } = await resolveFileHandle(rootHandle, pagePath, true);
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function deleteFilePage(rootHandle, pagePath) {
  const parts = pagePath.split('/');
  let dir = rootHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i]);
  }
  await dir.removeEntry(parts[parts.length - 1], { recursive: true });
}
