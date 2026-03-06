# Notemark

A minimal local-first note-taking app. Your pages live as plain markdown files on your own machine — no accounts, no sync, no cloud.

![Dark UI with sidebar and block editor](public/ss.png)

## How it works

Pick a folder on your machine. NC reads and writes `.md` files directly to that folder using the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API). Nothing leaves your computer.

## Features

- **Block editor** — paragraphs, headings, lists, quotes, code, and dividers
- **Slash commands** — type `/` to insert any block type
- **Drag to reorder** — grab the handle to reorder blocks
- **Page outline** — heading navigator shown in the right margin on wide screens
- **Cmd+K search** — fuzzy-filter all pages instantly
- **Auto-save** — changes are written to disk 800ms after you stop typing
- **Persistent folder** — remembers your folder across sessions via IndexedDB
- **Persistent last page** — reopens the last page you had open after a reload

## Requirements

Chrome or Edge (desktop). The File System Access API is not available in Firefox or Safari.

## Getting started

```bash
git clone https://github.com/you/nc.git
cd nc
npm install
npm run build
npm start
```

Then open `http://localhost:3000` in Chrome or Edge and pick a folder.

## Development

```bash
npm run dev   # Vite dev server at http://localhost:5173
```

## Stack

- **Backend** — Node.js + Express (serves the built frontend, no runtime API calls)
- **Frontend** — React 18 + Vite + Tailwind CSS + shadcn/ui
- **Storage** — File System Access API + IndexedDB (handle) + localStorage (last page)

## Project structure

```
nc/
├── server.js          # Express — serves dist/
├── src/
│   ├── App.jsx        # Root state (folder, pages, current page)
│   ├── fs.js          # File System Access API helpers
│   ├── markdown.js    # Markdown parser / serializer
│   └── components/
│       ├── BlockEditor.jsx
│       ├── Block.jsx
│       ├── PageTree.jsx
│       ├── PageOutline.jsx
│       ├── SearchDialog.jsx
│       └── ui/        # shadcn/ui primitives
└── dist/              # Vite build output (served by Express)
```

## License

MIT
