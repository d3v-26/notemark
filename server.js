const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

app.disable('x-powered-by');
app.use(express.static(DIST_DIR, {
  index: false,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
}));

// Client-side routing fallback. Note files are accessed directly in the browser
// through the File System Access API; this server never reads user content.
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Notemark running at http://localhost:${PORT}`);
});
