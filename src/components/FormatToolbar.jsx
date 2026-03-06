import { Bold, Italic, Underline, Highlighter } from 'lucide-react';

const FORMATS = [
  { label: 'Bold',      Icon: Bold,        cmd: 'bold',      key: '⌘B' },
  { label: 'Italic',    Icon: Italic,       cmd: 'italic',    key: '⌘I' },
  { label: 'Underline', Icon: Underline,    cmd: 'underline', key: '⌘U' },
  { label: 'Highlight', Icon: Highlighter,  cmd: 'highlight', key: null },
];

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function toggleHighlight() {
  const sel = window.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return;
  const anchor = sel.anchorNode?.parentElement;
  const mark = anchor?.closest('mark');
  if (mark) {
    const parent = mark.parentNode;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    return;
  }
  try {
    const m = document.createElement('mark');
    sel.getRangeAt(0).surroundContents(m);
  } catch {
    const m = document.createElement('mark');
    m.appendChild(sel.getRangeAt(0).extractContents());
    sel.getRangeAt(0).insertNode(m);
  }
}

export default function FormatToolbar({ rect, onFormatApplied }) {
  const width = 172;
  const left = clamp(rect.left + rect.width / 2 - width / 2, 8, window.innerWidth - width - 8);
  const top = rect.top - 44 - 6 < 8 ? rect.bottom + 6 : rect.top - 44 - 6;

  function applyFormat(cmd) {
    if (cmd === 'highlight') {
      toggleHighlight();
    } else {
      document.execCommand(cmd);
    }
    onFormatApplied();
  }

  return (
    <div
      style={{ position: 'fixed', left, top, width, zIndex: 300 }}
      className="flex items-center gap-0.5 px-1.5 py-1 bg-popover border border-border rounded-lg shadow-xl animate-in fade-in-0 zoom-in-95 duration-100"
    >
      {FORMATS.map(({ label, Icon, cmd, key }) => (
        <button
          key={cmd}
          title={key ? `${label} (${key})` : label}
          onMouseDown={e => { e.preventDefault(); applyFormat(cmd); }}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
