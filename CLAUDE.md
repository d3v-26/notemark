# Notemark repository guide

Notemark is a React and Vite local-first Markdown workspace.

## Architecture

- `src/App.jsx` owns the selected folder, page tree, navigation, theme, and global shortcuts.
- `src/fs.js` wraps the File System Access API and IndexedDB directory-handle persistence.
- `src/markdown.js` parses and serializes editor blocks to ordinary Markdown.
- `src/components/BlockEditor.jsx` owns block state, autosave, reordering, and editor commands.
- `src/components/Block.jsx` implements content-editable behavior and keyboard interactions.
- `server.js` serves `dist/` only. It must never access user note contents.

## Conventions

- Preserve Markdown round-tripping when adding block types.
- Keep note I/O browser-side and permission-based.
- Maintain keyboard and pointer equivalents for editor actions.
- Use `npm run build` after editor or Markdown changes.

## Commands

- `npm run dev` — Vite development server
- `npm run build` — production build
- `npm start` — serve the production build on port 3000
