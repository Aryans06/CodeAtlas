'use client';
import { useEffect, useRef, useState } from 'react';

interface ArchModalProps {
  mermaidCode: string;
  fileCount: number;
  isLoading: boolean;
  onClose: () => void;
}

export default function ArchModal({ mermaidCode, fileCount, isLoading, onClose }: ArchModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    if (!mermaidCode || !containerRef.current) return;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#7f1d1d',
            primaryTextColor: '#fecaca',
            primaryBorderColor: '#ef4444',
            lineColor: '#fb7185',
            secondaryColor: '#1c1917',
            tertiaryColor: '#0c0a09',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
          },
        });

        // Clear previous render
        containerRef.current!.innerHTML = '';
        
        const { svg } = await mermaid.render('arch-diagram', mermaidCode);
        containerRef.current!.innerHTML = svg;
        setRenderError('');
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setRenderError(err.message || 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [mermaidCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="modal-overlay"
      style={{ display: 'flex', zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        width: '90vw',
        maxWidth: '1100px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>🗺️</span>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Architecture Diagram
            </h2>
            {fileCount > 0 && (
              <span style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fb7185',
                borderRadius: '10px',
              }}>
                {fileCount} files
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {mermaidCode && (
              <button
                onClick={handleCopy}
                className="btn btn--ghost"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                {copied ? '✅ Copied!' : '📋 Copy Mermaid'}
              </button>
            )}
            <button
              onClick={onClose}
              className="btn btn--ghost"
              style={{ padding: '6px 10px' }}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}>
          {isLoading ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid var(--border)',
                borderTopColor: '#ef4444',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Analyzing architecture...
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '4px' }}>
                AI is mapping file dependencies
              </p>
            </div>
          ) : renderError ? (
            <div style={{ textAlign: 'center', maxWidth: '500px' }}>
              <p style={{ color: '#ef4444', marginBottom: '12px' }}>⚠️ Diagram render failed</p>
              <pre style={{
                background: 'rgba(239, 68, 68, 0.08)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
              }}>
                {renderError}
              </pre>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '12px' }}>
                You can still copy the raw Mermaid code and paste it into{' '}
                <a href="https://mermaid.live" target="_blank" rel="noreferrer" style={{ color: '#fb7185' }}>
                  mermaid.live
                </a>
              </p>
            </div>
          ) : (
            <div
              ref={containerRef}
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
