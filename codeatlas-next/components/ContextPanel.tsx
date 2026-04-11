'use client';
import type { Source } from '@/app/page';

interface ContextPanelProps {
  sources: Source[];
}

function scoreColor(score: number): string {
  if (score >= 0.8) return '#34d399';
  if (score >= 0.5) return '#fbbf24';
  return '#f87171';
}

function scoreLabel(score: number): string {
  if (score >= 0.8) return 'High';
  if (score >= 0.5) return 'Medium';
  return 'Low';
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
          {sources.length > 0 && (
            <span style={{
              fontSize: '0.6rem',
              padding: '1px 6px',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#fb7185',
              borderRadius: '8px',
              marginLeft: '6px',
              fontWeight: 600,
            }}>
              {sources.length} sources
            </span>
          )}
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
            <div key={i} className="context-snippet" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="context-snippet__header">
                <span className="context-snippet__file">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: '4px', opacity: 0.5 }}>
                    <path d="M2 1h5l3 3v7a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1" />
                  </svg>
                  {src.file}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="context-snippet__lines">L{src.startLine}–{src.endLine}</span>
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '6px',
                    background: `${scoreColor(src.score)}18`,
                    color: scoreColor(src.score),
                    border: `1px solid ${scoreColor(src.score)}30`,
                  }}>
                    {(((src.score || 0)) * 100).toFixed(0)}% {scoreLabel(src.score || 0)}
                  </span>
                </div>
              </div>
              <pre className="context-snippet__code">{src.preview}</pre>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
