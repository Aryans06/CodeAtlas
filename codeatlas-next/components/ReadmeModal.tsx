'use client';
import { useState, useEffect, useRef } from 'react';

interface ReadmeModalProps {
  privacyMode: boolean;
  repoName: string | null;
  onClose: () => void;
}

export default function ReadmeModal({ privacyMode, repoName, onClose }: ReadmeModalProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    const generateReadme = async () => {
      try {
        const res = await fetch('/api/readme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privacyMode, repoName }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to generate');
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        setIsLoading(false);

        let buffer = '';
        while (active) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6);
              if (payload === '[DONE]') break;
              try {
                const parsed = JSON.parse(payload);
                if (parsed.token) {
                  setContent(prev => prev + parsed.token);
                }
              } catch (e) {}
            }
          }
        }
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    generateReadme();

    return () => { active = false; };
  }, [privacyMode]);

  // Auto-scroll to bottom while generating
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="graph-modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="graph-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', margin: '0 auto', top: '40px', bottom: '40px', right: '0', left: '0' }}>
        <div className="graph-modal__header" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
          <div className="graph-modal__title">
            <span style={{ fontSize: '1.2rem' }}>📄</span> 
            <span>Generated README.md</span>
          </div>
          <div className="graph-modal__controls">
            <button 
              className="graph-modal__btn" 
              onClick={handleCopy} 
              disabled={!content || isLoading}
              style={{ color: copied ? '#34d399' : '' }}
            >
              {copied ? '✅ Copied' : '📋 Copy Markdown'}
            </button>
            <button className="graph-modal__btn graph-modal__btn--close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div 
          className="graph-modal__canvas" 
          ref={contentRef}
          style={{ overflowY: 'auto', padding: '24px', background: 'var(--bg-primary)', display: 'block' }}
        >
          {error ? (
            <div style={{ color: '#ef4444', textAlign: 'center', marginTop: '2rem' }}>
              ❌ Error: {error}
            </div>
          ) : isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: 'var(--text-secondary)' }}>
              <div className="graph-modal__spinner" style={{ borderTopColor: '#a78bfa' }}></div>
              Analyzing codebase structure...
            </div>
          ) : (
            <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
              {content || <span style={{ opacity: 0.5 }}>Generating...</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
