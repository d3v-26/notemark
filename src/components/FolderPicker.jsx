import { ArrowRight, Check, FileText, FolderOpen, HardDrive, ShieldCheck } from 'lucide-react';

function BrandMark() {
  return <div className="brand-mark brand-mark-large" aria-hidden="true"><span /><span /><span /></div>;
}

export default function FolderPicker({ onOpen, reconnect, storedName }) {
  const hasStored = reconnect && storedName;
  const supported = 'showDirectoryPicker' in window;

  return (
    <main className="welcome-screen">
      <div className="welcome-noise" />
      <section className="welcome-copy-panel">
        <div className="welcome-brand"><BrandMark /><span>NOTEMARK</span></div>
        <div className="welcome-copy">
          <p className="eyebrow">LOCAL-FIRST WRITING</p>
          <h1>Your thoughts.<br /><em>Exactly where</em><br />you left them.</h1>
          <p>A calm writing space that works directly with the Markdown files on your computer. No account. No cloud. No lock-in.</p>
        </div>
        <div className="welcome-proof">
          <span><ShieldCheck size={16} /> Private by design</span>
          <span><FileText size={16} /> Plain Markdown</span>
        </div>
      </section>

      <section className="welcome-action-panel">
        <div className="folder-card">
          <div className="folder-illustration" aria-hidden="true">
            <div className="folder-shape"><span /></div>
          </div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h2>{hasStored ? `Welcome back to ${storedName}` : 'Choose a home for your notes'}</h2>
          <p className="folder-card-copy">
            {hasStored
              ? 'Your browser just needs permission to reconnect to this folder.'
              : 'Select any folder. Notemark will read and save Markdown files there—nothing is ever uploaded.'}
          </p>

          {supported ? (
            <>
              <button className="folder-cta" onClick={() => onOpen(false)}>
                <FolderOpen size={18} />
                <span>{hasStored ? `Reconnect ${storedName}` : 'Choose notes folder'}</span>
                <ArrowRight size={17} />
              </button>
              {hasStored && <button className="text-button" onClick={() => onOpen(true)}>Use a different folder</button>}
            </>
          ) : (
            <div className="unsupported-message">This browser does not support local folder access. Open Notemark in Chrome or Edge.</div>
          )}

          <div className="privacy-note">
            <HardDrive size={16} />
            <span><strong>Stays on this device</strong>Your files never pass through a server.</span>
            <Check size={15} />
          </div>
        </div>
      </section>
    </main>
  );
}
