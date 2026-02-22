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
