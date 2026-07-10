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
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-[12.5px] text-[#93a098] hover:bg-white/[.055] hover:text-white transition-colors select-none"
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="flex items-center text-[#718078] flex-shrink-0">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
          <FolderOpen size={13} className="flex-shrink-0 text-[#718078]" />
          <span className="truncate flex-1">{item.name}</span>
        </div>
        {expanded && item.children && (
          <div className="ml-3 border-l border-white/[.06] pl-1">
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
              'flex items-center gap-2 px-2 py-[6px] rounded-md cursor-pointer text-[12.5px] text-[#93a098] transition-colors select-none group',
              'hover:bg-white/[.055] hover:text-white',
              isActive && 'font-medium'
            )}
            style={{
              paddingLeft: 8 + depth * 14,
              backgroundColor: isActive ? 'rgba(237,104,70,0.13)' : undefined,
              color: isActive ? '#f18a70' : undefined,
            }}
            onClick={() => onPageOpen(item.path)}
          >
            <FileText
              size={13}
              className="flex-shrink-0"
              style={{ color: isActive ? '#f18a70' : '#66746c' }}
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
