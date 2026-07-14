// ── IndexedDB helpers ──

const HANDLE_KEY = 'root';
const HANDLE_AUTHORIZED_AT_KEY = 'root-authorized-at';

export const HANDLE_SESSION_DURATION_MS = 2 * 24 * 60 * 60 * 1000;

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
  const authorizedAt = Date.now();
  return new Promise((resolve) => {
    const tx = db.transaction('handles', 'readwrite');
    const store = tx.objectStore('handles');
    store.put(handle, HANDLE_KEY);
    store.put(authorizedAt, HANDLE_AUTHORIZED_AT_KEY);
    tx.oncomplete = () => resolve(authorizedAt);
  });
}

export async function loadHandle() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function loadHandleAuthorizedAt() {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get(HANDLE_AUTHORIZED_AT_KEY);
    req.onsuccess = () => resolve(Number.isFinite(req.result) ? req.result : null);
    req.onerror = () => resolve(null);
  });
}

export function isHandleSessionValid(authorizedAt, now = Date.now()) {
  if (!Number.isFinite(authorizedAt) || authorizedAt > now) return false;
  return now - authorizedAt < HANDLE_SESSION_DURATION_MS;
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

export async function writeAssetFile(rootHandle, file) {
  const assetsDir = await rootHandle.getDirectoryHandle('.notemark-assets', { create: true });
  const extension = file.name.includes('.') ? `.${file.name.split('.').pop().toLowerCase()}` : '';
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'image';
  const fileName = `${Date.now()}-${base}${extension}`;
  const handle = await assetsDir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(file);
  await writable.close();
  return `.notemark-assets/${fileName}`;
}

export async function readAssetUrl(rootHandle, assetPath) {
  if (/^(https?:|data:|blob:)/i.test(assetPath)) return assetPath;
  const parts = assetPath.replace(/^\.\//, '').split('/').filter(Boolean);
  let directory = rootHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    directory = await directory.getDirectoryHandle(parts[i]);
  }
  const handle = await directory.getFileHandle(parts.at(-1));
  const file = await handle.getFile();
  return URL.createObjectURL(file);
}
