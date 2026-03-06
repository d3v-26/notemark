import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FolderPicker({ onOpen, reconnect, storedName }) {
  const hasStored = reconnect && storedName;

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center max-w-sm w-full mx-4 p-12 bg-card border border-border rounded-xl shadow-2xl">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary border border-border rounded-xl text-xl font-bold tracking-wide text-primary mb-5 shadow-[0_0_0_4px_rgba(124,58,237,0.12)]">
          NC
        </div>

        <h2 className="text-lg font-semibold text-foreground mb-2.5">
          {hasStored ? `Reconnect to "${storedName}"` : 'Your notes, your machine'}
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {hasStored
            ? 'Grant permission to access your notes folder again.'
            : 'Choose a folder to store your pages as markdown files. Files stay on your machine — nothing is uploaded anywhere.'}
        </p>

        {'showDirectoryPicker' in window ? (
          <>
            <Button onClick={() => onOpen(false)} className="gap-2 mb-4 w-full">
              <FolderOpen size={16} />
              {hasStored ? 'Reconnect Folder' : 'Open Folder'}
            </Button>
            {hasStored && (
              <button
                onClick={() => onOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Choose a different folder
              </button>
            )}
          </>
        ) : (
          <Button disabled className="w-full">
            Browser not supported
          </Button>
        )}

        <p className="text-xs text-muted-foreground/50 mt-4">
          Works in Chrome and Edge
        </p>
      </div>
    </div>
  );
}
