# Notemark

A private, local-first Markdown workspace with a focused block editor. Notemark opens a folder on your computer and works directly with the `.md` files inside it—no account, database, sync service, or proprietary format.

## What it does

- **Writes straight to Markdown** using the browser's File System Access API
- **Block editor** for paragraphs, headings, nested lists, to-dos, callouts, quotes, code, and dividers
- **Local images** copied into `.notemark-assets/`, captioned in the editor, and saved with standard Markdown image syntax
- **Full-text command search** across page titles and contents with `Cmd/Ctrl + K`
- **Keyboard-first creation** with `Cmd/Ctrl + N` and slash commands
- **Reliable autosave** with local save, progress, and error states
- **Nested folder navigation** with rename and delete actions
- **Formatting tools** for bold, italic, underline, strike, inline code, links, and highlights
- **Implicit list behavior**: `Enter` continues a list, `Tab` nests it, `Shift+Tab` lifts it, and an empty item exits naturally
- **Block actions** to add, duplicate, move, delete, drag-to-reorder, or transform blocks
- **Notion-style shortcuts** for Markdown conversion, block types, duplication, movement, and to-do toggling
- **Heading outline**, word count, and Markdown copy
- **Page options** for width, typography, image insertion, and Markdown download
- **Responsive workspace** for desktop and narrow screens
- **Light and dark themes** remembered between sessions

## Run locally

```bash
npm install
npm run dev
```

Vite starts the development app at `http://localhost:5173`.

For a production build:

```bash
npm run build
npm start
```

The Express server serves `dist/` at `http://localhost:3000`.

## Browser support

Notemark needs the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API), so use a Chromium-based desktop browser such as Chrome or Edge. Folder access is permission-based and may need to be re-approved after restarting the browser.

## How storage works

The selected directory handle is remembered in IndexedDB. Page contents remain ordinary files in the selected folder, and the last-opened page and theme are kept in local storage. The app has no runtime API and does not upload note contents.

## Stack

- React 18 and Vite
- Tailwind CSS and Radix UI primitives
- Lucide icons
- Express for static production hosting
- File System Access API, IndexedDB, and local storage

## Project layout

```text
src/
├── App.jsx                 # workspace state and shortcuts
├── fs.js                   # local filesystem and IndexedDB helpers
├── markdown.js             # Markdown parser and serializer
└── components/
    ├── AppSidebar.jsx      # navigation and workspace controls
    ├── BlockEditor.jsx     # editor, autosave, and page tools
    ├── Block.jsx           # editable block behavior
    ├── SearchDialog.jsx    # full-text command search
    └── ui/                 # Radix-based primitives
```

## License

MIT
