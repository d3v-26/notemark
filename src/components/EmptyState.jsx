import { FilePlus } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <FilePlus size={48} strokeWidth={1.25} className="text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground/70">Select a page or create one</p>
      <p className="text-xs text-muted-foreground/40">
        Press <kbd className="inline-flex items-center px-1.5 py-px bg-secondary border border-border rounded text-xs text-foreground">+</kbd> in the sidebar to get started
      </p>
    </div>
  );
}
