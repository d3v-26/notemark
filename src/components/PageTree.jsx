import { useState } from 'react';
import { FileText, ChevronDown, ChevronRight, Pencil, Trash2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { readFilePage, writeFilePage, deleteFilePage } from '@/fs';

function PageTreeItem({
  item, depth, currentPage, rootHandle,
  onPageOpen, onPageDelete, onPageRename, filter,
}) {
  const [expanded, setExpanded] = useState(true);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  if (item.type === 'folder') {
    const hasMatch = filter
      ? JSON.stringify(item.children).toLowerCase().includes(filter.toLowerCase())
      : true;
    if (!hasMatch) return null;

    return (
      <div>
        <div
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-[13px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors select-none"
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="flex items-center text-muted-foreground/60 flex-shrink-0">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
          <FolderOpen size={13} className="flex-shrink-0" />
          <span className="truncate flex-1">{item.name}</span>
        </div>
        {expanded && item.children && (
          <div className="ml-3 border-l border-border/50 pl-1">
            {item.children.map(child => (
              <PageTreeItem
                key={child.path}
                item={child}
                depth={depth + 1}
                currentPage={currentPage}
                rootHandle={rootHandle}
                onPageOpen={onPageOpen}
                onPageDelete={onPageDelete}
                onPageRename={onPageRename}
                filter={filter}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Page item
  if (filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return null;

  const isActive = currentPage === item.path;

  async function handleRename() {
    if (!renameValue.trim()) { setRenameOpen(false); return; }
    const dir = item.path.substring(0, item.path.lastIndexOf('/') + 1);
    const newPath = dir + renameValue.trim() + '.md';
    try {
      const data = await readFilePage(rootHandle, item.path);
      await writeFilePage(rootHandle, newPath, data.content);
      await deleteFilePage(rootHandle, item.path);
      setRenameOpen(false);
      onPageRename(item.path, newPath);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete() {
    try {
      await deleteFilePage(rootHandle, item.path);
      setDeleteOpen(false);
      onPageDelete(item.path);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-[5px] rounded-md cursor-pointer text-[13px] text-muted-foreground transition-colors select-none group',
              'hover:bg-secondary hover:text-foreground',
              isActive && 'bg-violet-subtle text-primary font-medium [&]:hover:bg-violet-subtle'
            )}
            style={{
              paddingLeft: 8 + depth * 14,
              backgroundColor: isActive ? 'rgba(124,58,237,0.12)' : undefined,
              color: isActive ? '#a78bfa' : undefined,
            }}
            onClick={() => onPageOpen(item.path)}
          >
            <FileText
              size={13}
              className={cn('flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/50')}
              style={isActive ? { color: '#a78bfa' } : undefined}
            />
            <span className="truncate flex-1">{item.name}</span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => { setRenameValue(item.name); setRenameOpen(true); }}
          >
            <Pencil size={14} />
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 size={14} />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename page</DialogTitle>
            <DialogDescription>Enter a new name for "{item.name}".</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function PageTree({ pages, currentPage, rootHandle, onPageOpen, onPageDelete, onPageRename, filter }) {
  return (
    <nav className="flex-1 overflow-y-auto py-1 px-1.5">
      {pages.map(item => (
        <PageTreeItem
          key={item.path}
          item={item}
          depth={0}
          currentPage={currentPage}
          rootHandle={rootHandle}
          onPageOpen={onPageOpen}
          onPageDelete={onPageDelete}
          onPageRename={onPageRename}
          filter={filter}
        />
      ))}
    </nav>
  );
}
