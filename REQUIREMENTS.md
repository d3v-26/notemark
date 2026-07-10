# Notemark product requirements

## Product

Notemark is a private, local-first writing workspace. It edits ordinary Markdown files through the browser's File System Access API and never sends note contents to the server.

## Core behavior

- Open and remember a user-selected notes directory
- Create, search, edit, rename, and delete Markdown pages
- Preserve nested folders in the navigation tree
- Autosave edits with visible progress and failure feedback
- Support paragraphs, headings, nested lists, to-dos, quotes, callouts, code, and dividers
- Provide searchable slash commands, Markdown shortcuts, inline formatting, drag reordering, and block actions
- Keep navigation and editing usable at desktop and narrow viewport sizes
- Provide persistent light and dark themes

## Storage and privacy

- Markdown files are the source of truth
- The selected directory handle is stored in IndexedDB
- Interface preferences and the last page are stored in local storage
- Express serves built assets only; it must not read or write note contents

## Supported platform

A Chromium-based desktop browser with File System Access API support, such as Chrome or Edge.

## Non-goals

- Authentication or multi-user collaboration
- Cloud synchronization
- Proprietary page storage
- Notion databases or third-party embeds
