# NC - Notion Clone (Local-First)

## Overview
A minimal Notion-like web app that stores pages as local markdown files and serves a web UI for viewing and editing them.

## Core Features

### Pages
- Create, edit, rename, and delete pages
- Pages stored as `.md` files in a local `pages/` directory
- Rich-text-ish editing via a block-based markdown editor
- Nested pages via subdirectories

### Editor
- Block-based editing (paragraphs, headings, lists, code blocks, quotes)
- Click-to-edit inline editing (no separate edit mode)
- Slash `/` command menu to change block types
- Drag-to-reorder blocks

### Sidebar
- Tree view of all pages/folders
- Create new page button
- Click to navigate between pages

### Search
- Quick search across all page titles

## Tech Stack
- **Backend:** Node.js + Express
- **Frontend:** Vanilla JS (no framework) + HTML + CSS
- **Storage:** Local filesystem (markdown files)
- **No database.** The filesystem is the database.

## Non-Goals
- No authentication / multi-user
- No real-time collaboration
- No cloud sync
- No complex databases/tables (just pages)
- No image uploads (first version)
