const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const PAGES_DIR = path.join(__dirname, 'pages');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure pages dir exists
if (!fs.existsSync(PAGES_DIR)) fs.mkdirSync(PAGES_DIR);

// Create a default welcome page if pages dir is empty
if (fs.readdirSync(PAGES_DIR).length === 0) {
  fs.writeFileSync(path.join(PAGES_DIR, 'Welcome.md'), '# Welcome to NC\n\nStart editing this page or create a new one from the sidebar.\n');
}

// Helper: resolve a page path safely
function resolvePage(pagePath) {
  const resolved = path.resolve(PAGES_DIR, pagePath);
  if (!resolved.startsWith(PAGES_DIR)) return null;
  return resolved;
}

// Helper: build page tree
function buildTree(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => {
    // folders first, then files
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const result = [];
  for (const entry of entries) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        path: relPath,
        type: 'folder',
        children: buildTree(path.join(dir, entry.name), relPath),
      });
    } else if (entry.name.endsWith('.md')) {
      result.push({
        name: entry.name.replace(/\.md$/, ''),
        path: relPath,
        type: 'page',
      });
    }
  }
  return result;
}

// List all pages as tree
app.get('/api/pages', (req, res) => {
  res.json(buildTree(PAGES_DIR));
});

// Read a page
app.get('/api/pages/*', (req, res) => {
  const pagePath = req.params[0];
  const fullPath = resolvePage(pagePath);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Not found' });

  const content = fs.readFileSync(fullPath, 'utf-8');
  const name = path.basename(fullPath, '.md');
  res.json({ name, path: pagePath, content });
});

// Create a page
app.post('/api/pages/*', (req, res) => {
  const pagePath = req.params[0];
  const fullPath = resolvePage(pagePath);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });

  // Create parent dirs if needed
  const dir = path.dirname(fullPath);
  fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(fullPath)) return res.status(409).json({ error: 'Already exists' });

  const content = req.body.content || `# ${path.basename(pagePath, '.md')}\n`;
  fs.writeFileSync(fullPath, content);
  res.status(201).json({ path: pagePath, content });
});

// Update a page
app.put('/api/pages/*', (req, res) => {
  const pagePath = req.params[0];
  const fullPath = resolvePage(pagePath);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Not found' });

  fs.writeFileSync(fullPath, req.body.content);
  res.json({ path: pagePath, content: req.body.content });
});

// Delete a page
app.delete('/api/pages/*', (req, res) => {
  const pagePath = req.params[0];
  const fullPath = resolvePage(pagePath);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Not found' });

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    fs.rmSync(fullPath, { recursive: true });
  } else {
    fs.unlinkSync(fullPath);
  }
  res.json({ deleted: pagePath });
});

// Rename / move a page
app.patch('/api/pages/*', (req, res) => {
  const pagePath = req.params[0];
  const fullPath = resolvePage(pagePath);
  if (!fullPath) return res.status(400).json({ error: 'Invalid path' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Not found' });

  const newPath = req.body.newPath;
  if (!newPath) return res.status(400).json({ error: 'newPath required' });
  const newFull = resolvePage(newPath);
  if (!newFull) return res.status(400).json({ error: 'Invalid new path' });

  const dir = path.dirname(newFull);
  fs.mkdirSync(dir, { recursive: true });
  fs.renameSync(fullPath, newFull);
  res.json({ oldPath: pagePath, newPath });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`NC running at http://localhost:${PORT}`);
});
