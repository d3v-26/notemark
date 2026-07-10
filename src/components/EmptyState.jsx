import { ArrowUpRight, FilePlus2, Search } from 'lucide-react';

export default function EmptyState({ onCreate, onSearch }) {
  return (
    <div className="empty-workspace">
      <div className="empty-orbit" aria-hidden="true">
        <div className="empty-paper"><span /><span /><span /></div>
      </div>
      <p className="eyebrow">A blank desk</p>
      <h1>What will you<br />make note of?</h1>
      <p className="empty-copy">Open a page from your library, or start somewhere new. Everything stays in your folder as plain Markdown.</p>
      <div className="empty-actions">
        <button className="primary-action" onClick={onCreate}>
          <FilePlus2 size={17} /> Create a page <ArrowUpRight size={15} />
        </button>
        <button className="secondary-action" onClick={onSearch}>
          <Search size={16} /> Find a note
        </button>
      </div>
    </div>
  );
}
