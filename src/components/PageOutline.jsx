import { useState, useEffect, useCallback } from 'react';

const INDENT = { h1: 0, h2: 10, h3: 18 };

export default function PageOutline({ headings, contentRefs, scrollContainer }) {
  const [activeId, setActiveId] = useState(null);

  // Track active heading on scroll
  const updateActive = useCallback(() => {
    const container = scrollContainer?.current;
    if (!container) return;
    const threshold = container.getBoundingClientRect().top + 80;
    let active = null;
    for (const h of headings) {
      const el = contentRefs.current.get(h.id);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= threshold) active = h.id;
    }
    setActiveId(active);
  }, [headings, contentRefs, scrollContainer]);

  useEffect(() => {
    const container = scrollContainer?.current;
    if (!container) return;
    container.addEventListener('scroll', updateActive, { passive: true });
    updateActive();
    return () => container.removeEventListener('scroll', updateActive);
  }, [updateActive, scrollContainer]);

  if (headings.length < 1) return null;

  function scrollTo(id) {
    contentRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="fixed right-4 top-16 z-40 w-36 max-h-[calc(100vh-180px)] overflow-y-auto hidden xl:flex flex-col">
      <div className="flex flex-col gap-px py-1 border-l border-border/60">
        {headings.map(h => {
          const isActive = activeId === h.id;
          return (
            <button
              key={h.id}
              onClick={() => scrollTo(h.id)}
              title={h.content}
              className="text-left text-[11px] leading-snug py-[3px] pr-2 truncate w-full transition-colors"
              style={{
                paddingLeft: INDENT[h.type] + 10,
                color: isActive
                  ? 'rgba(167,139,250,0.9)'
                  : 'hsl(var(--muted-foreground) / 0.35)',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.color = 'hsl(var(--muted-foreground) / 0.65)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.color = 'hsl(var(--muted-foreground) / 0.35)';
              }}
            >
              {h.content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
