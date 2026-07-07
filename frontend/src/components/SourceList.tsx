import { useState } from 'react';
import type { Source } from '../types';

type Props = {
  sources: Source[];
};

export function SourceList({ sources }: Props) {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(new Set());

  if (sources.length === 0) return null;

  const toggle = (index: number) => {
    setOpenIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="source-section">
      <div className="source-header">
        <span className="source-badge">出典</span>
        <span className="source-count">{sources.length}件の根拠</span>
      </div>
      <ul className="source-list">
        {sources.map((source, i) => {
          const isOpen = openIndexes.has(i);
          return (
            <li key={i} className="source-item">
              <button
                className="source-toggle"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
              >
                <span className="source-doc">📎 {source.docName}</span>
                <span className="source-page">p.{source.page}</span>
                <span className="source-chevron">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <blockquote className="source-excerpt">{source.excerpt}</blockquote>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
