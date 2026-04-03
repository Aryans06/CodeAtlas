'use client';
import type { Source } from '@/app/page';

interface ContextPanelProps {
  sources: Source[];
}

export default function ContextPanel({ sources }: ContextPanelProps) {
  return (
    <aside className="context" id="contextPanel">
      <div className="context__header">
        <h2 className="context__title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 3H14M2 8H14M2 13H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>{' '}
          <span id="contextTitleText">Context</span>
        </h2>
      </div>

      {sources.length === 0 ? (
        <div className="context__empty" id="contextEmpty">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="4" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="1.2" opacity="0.2" />
            <path d="M12 14H28M12 20H24M12 26H20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.2" />
          </svg>
          <p>Ask a question to see relevant code here</p>
        </div>
      ) : (
        <div className="context__snippets" id="contextSnippets">
          {sources.map((src, i) => (
            <div key={i} className="context-snippet">
              <div className="context-snippet__header">
                <span className="context-snippet__file">{src.file}</span>
                <span className="context-snippet__lines">L{src.startLine}–{src.endLine}</span>
                <span className="context-snippet__score">{(src.score * 100).toFixed(0)}%</span>
              </div>
              <pre className="context-snippet__code">{src.preview}</pre>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
