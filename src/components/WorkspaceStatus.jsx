import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, FolderOpen, HardDrive, RefreshCw } from 'lucide-react';

export default function WorkspaceStatus({ folderName, onReconnect, onSwitch }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  async function runAction(name, action) {
    setOpen(false);
    setPending(name);
    try {
      await action();
    } finally {
      setPending(null);
    }
  }

  const statusLabel = pending === 'reconnect'
    ? 'Reconnecting…'
    : pending === 'switch'
      ? 'Choosing folder…'
      : folderName || 'Local folder';

  return (
    <div className="workspace-status" ref={menuRef}>
      <button
        className={`workspace-status-trigger ${open ? 'is-open' : ''}`}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Folder status: connected to ${folderName || 'local folder'}`}
        title={`Connected to ${folderName || 'local folder'}`}
        disabled={Boolean(pending)}
        onClick={() => setOpen(value => !value)}
      >
        <span className="workspace-status-dot" aria-hidden="true" />
        <span className="workspace-status-copy">
          <small>Connected folder</small>
          <strong>{statusLabel}</strong>
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div className="workspace-status-menu" role="menu">
          <div className="workspace-status-summary">
            <span className="workspace-status-icon"><HardDrive size={16} /></span>
            <span>
              <small>Folder status</small>
              <strong title={folderName}>{folderName || 'Local folder'}</strong>
            </span>
            <span className="workspace-status-connected"><Check size={11} /> Connected</span>
          </div>
          <div className="workspace-status-actions">
            <button type="button" role="menuitem" onClick={() => runAction('reconnect', onReconnect)}>
              <RefreshCw size={15} />
              <span><strong>Reconnect folder</strong><small>Refresh access for another 2 days</small></span>
            </button>
            <button type="button" role="menuitem" onClick={() => runAction('switch', onSwitch)}>
              <FolderOpen size={15} />
              <span><strong>Switch folder</strong><small>Choose a different workspace</small></span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
