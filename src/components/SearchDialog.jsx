import { useState, useEffect, useMemo } from 'react';
import { FileText, LoaderCircle, Search } from 'lucide-react';
import { readFilePage } from '@/fs';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from '@/components/ui/command';

function flattenPages(items, result = []) {
  for (const item of items) {
    if (item.type === 'page') result.push(item);
    if (item.children) flattenPages(item.children, result);
  }
  return result;
}

function cleanExcerpt(content) {
  return content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`=>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 110);
}

export default function SearchDialog({ rootHandle, pages, onPageOpen }) {
  const [open, setOpen] = useState(false);
  const [indexedPages, setIndexedPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const flatPages = useMemo(() => flattenPages(pages), [pages]);

  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(value => !value);
      }
    }
    function openHandler() { setOpen(true); }
    window.addEventListener('keydown', handler);
    window.addEventListener('nc:open-search', openHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('nc:open-search', openHandler);
    };
  }, []);

  useEffect(() => {
    if (!open || !rootHandle) return;
    let cancelled = false;
    setLoading(true);
    Promise.all(flatPages.map(async page => {
      try {
        const data = await readFilePage(rootHandle, page.path);
        return { ...page, searchContent: data.content, excerpt: cleanExcerpt(data.content) };
      } catch {
        return { ...page, searchContent: '', excerpt: '' };
      }
    })).then(result => {
      if (!cancelled) { setIndexedPages(result); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [open, rootHandle, flatPages]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="command-heading"><Search size={14} /><span>Search your workspace</span><kbd>ESC</kbd></div>
      <CommandInput placeholder="Search titles and note contents…" />
      <CommandList>
        {loading && <div className="search-loading"><LoaderCircle size={15} className="animate-spin" /> Indexing notes…</div>}
        <CommandEmpty>No matching notes found.</CommandEmpty>
        <CommandGroup heading={`${indexedPages.length || flatPages.length} notes`}>
          {(indexedPages.length ? indexedPages : flatPages).map(page => (
            <CommandItem
              key={page.path}
              value={`${page.name} ${page.path} ${page.searchContent || ''}`}
              onSelect={() => { onPageOpen(page.path); setOpen(false); }}
              className="search-result"
            >
              <div className="search-result-icon"><FileText size={15} /></div>
              <div className="min-w-0 flex-1">
                <div className="search-result-title"><span>{page.name}</span><small>{page.path.replace(/\/[^/]+$/, '').replace(/\//g, ' / ') || 'Root'}</small></div>
                {page.excerpt && <p>{page.excerpt}</p>}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span></div>
    </CommandDialog>
  );
}
