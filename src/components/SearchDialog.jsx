import { useState, useEffect, useMemo } from 'react';
import { FileText } from 'lucide-react';
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

export default function SearchDialog({ pages, onPageOpen }) {
  const [open, setOpen] = useState(false);
  const flatPages = useMemo(() => flattenPages(pages), [pages]);

  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages..." />
      <CommandList>
        <CommandEmpty>No pages found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {flatPages.map(page => (
            <CommandItem
              key={page.path}
              value={page.path}
              onSelect={() => {
                onPageOpen(page.path);
                setOpen(false);
              }}
            >
              <FileText size={14} className="text-muted-foreground" />
              <span>{page.name}</span>
              {page.path.includes('/') && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {page.path.replace(/\/[^/]+$/, '').replace(/\//g, ' / ')}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
