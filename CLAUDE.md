# CLAUDE.md

## Project: NC (Notion Clone - Local First)

A minimal local-first Notion clone. Pages are markdown files on disk, served and edited through a web UI.

## Architecture
- `server.js` - Express server with REST API for CRUD on pages
- `public/` - Static frontend (HTML, CSS, JS)
- `pages/` - Where user pages are stored as `.md` files

## API Routes
- `GET /api/pages` - List all pages (tree structure)
- `GET /api/pages/:path` - Read a page's content
- `POST /api/pages/:path` - Create a new page
- `PUT /api/pages/:path` - Update a page's content
- `DELETE /api/pages/:path` - Delete a page
- `PATCH /api/pages/:path` - Rename/move a page

## Conventions
- Keep it simple. Vanilla JS, no build step, no frameworks.
- Pages are stored as markdown. The editor works with blocks that serialize to/from markdown.
- Minimal dependencies: only `express` and `marked` (for markdown rendering).

## Commands
- `npm start` - Start the server (default port 3000)
- `npm run dev` - Start with file watching (nodemon)

---

## NC (Notemark) — Auto-generated Summary

**What it does:** Block-based markdown note-taking app. The browser reads/writes `.md` files directly on the user's machine via the File System Access API (Chrome/Edge only). The Express server only serves the static frontend — it is not involved in any I/O at runtime.

**Project type:** frontend | **Stack:** Vanilla JS, HTML, CSS, Node.js + Express

**Key files:**
| File | Role |
|------|------|
| `server.js` | Serves `public/` as static files; also defines a REST API for pages that is **not called** by the frontend |
| `public/app.js` | All frontend logic: folder picker, IndexedDB handle persistence, File System API I/O, block editor, markdown parser/serializer, sidebar, slash menu, context menu, modals |
| `public/index.html` | App shell; pre-declares all overlay DOM (slash menu, context menu, confirm modal, folder picker screen) |
| `public/style.css` | Dark design system; CSS custom properties; block types styled via `[data-type]` attribute selectors |

**Critical architectural note:** The frontend uses `FileSystemDirectoryHandle` / `FileSystemFileHandle` directly — it never calls `/api/pages`. The root handle is persisted in IndexedDB (`db: "nc"`, store: `"handles"`, key: `"root"`). The `marked` npm dependency is declared but never imported.

**How to run:** `npm start` then open `http://localhost:3000` in Chrome or Edge

**Docs generated:** 2026-02-22 → `PROJECT_DOCS.md`
