'use client';
import { useEffect, useRef, useState } from 'react';

type DiagramType = 'dependency' | 'pie' | 'sequence';

interface TabInfo {
  id: DiagramType;
  label: string;
  icon: string;
  desc: string;
}

const TABS: TabInfo[] = [
  { id: 'dependency', label: 'Dependencies', icon: '🔗', desc: 'Import & module dependency graph' },
  { id: 'pie', label: 'File Distribution', icon: '📊', desc: 'Language breakdown across your codebase' },
  { id: 'sequence', label: 'Data Flow', icon: '🔄', desc: 'Request lifecycle sequence diagram' },
];

interface ArchModalProps {
  fileCount: number;
  privacyMode?: boolean;
  onClose: () => void;
}

export default function ArchModal({ fileCount, privacyMode, onClose }: ArchModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [renderError, setRenderError] = useState('');
  const [activeTab, setActiveTab] = useState<DiagramType>('dependency');
  const [isLoading, setIsLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState('');
  // Cache diagrams so we don't refetch on tab switch
  const cacheRef = useRef<Record<string, string>>({});

  const fetchDiagram = async (type: DiagramType) => {
    // If cached, use it
    if (cacheRef.current[type]) {
      setMermaidCode(cacheRef.current[type]);
      return;
    }

    setIsLoading(true);
    setMermaidCode('');
    setRenderError('');

    try {
      const res = await fetch('/api/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, privacyMode }),
      });
      const data = await res.json();
      if (res.ok) {
        cacheRef.current[type] = data.mermaid;
        setMermaidCode(data.mermaid);
      } else {
        setRenderError(data.error || 'Failed to generate diagram');
      }
    } catch (err: any) {
      setRenderError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on tab change
  useEffect(() => {
    fetchDiagram(activeTab);
  }, [activeTab]);

  // Render mermaid
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
            pie1: '#ef4444',
            pie2: '#3178c6',
            pie3: '#f7df1e',
            pie4: '#1572b6',
            pie5: '#61dafb',
            pie6: '#3776ab',
            pie7: '#8bc34a',
            pie8: '#e44d26',
            pieTitleTextSize: '16px',
            pieTitleTextColor: '#fecaca',
            pieSectionTextSize: '12px',
            pieSectionTextColor: '#ffffff',
            pieLegendTextSize: '12px',
            pieLegendTextColor: '#a1a1aa',
            pieStrokeColor: '#27272a',
            pieStrokeWidth: '2px',
          },
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
          sequence: { useMaxWidth: true, actorMargin: 60, messageFontSize: 13 },
        });

        containerRef.current!.innerHTML = '';
        // unique id per render to avoid mermaid caching issues
        const id = `arch-${activeTab}-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidCode);
        containerRef.current!.innerHTML = svg;
        setRenderError('');
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setRenderError(err.message || 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [mermaidCode, activeTab]);

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeInfo = TABS.find(t => t.id === activeTab)!;

  return (
    <div
      className="modal-overlay"
      style={{ display: 'flex', zIndex: 1000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary, #0f0f0f)',
        borderRadius: '16px',
        border: '1px solid var(--border, rgba(255,255,255,0.07))',
        width: '92vw',
        maxWidth: '1200px',
        maxHeight: '88vh',
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
          padding: '14px 24px',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.07))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>🗺️</span>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Visualizations
            </h2>
            {fileCount > 0 && (
              <span style={{
                fontSize: '0.65rem',
                padding: '2px 8px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fb7185',
                borderRadius: '10px',
                fontWeight: 600,
              }}>
                {fileCount} files indexed
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {mermaidCode && (
              <button onClick={handleCopy} className="btn btn--ghost" style={{ fontSize: '0.75rem', padding: '5px 10px' }}>
                {copied ? '✅ Copied!' : '📋 Copy Mermaid'}
              </button>
            )}
            <button onClick={onClose} className="btn btn--ghost" style={{ padding: '5px 8px' }} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0',
          padding: '0 24px',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.07))',
          background: 'rgba(255,255,255,0.015)',
        }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #ef4444' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: activeTab === tab.id ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Diagram Description */}
        <div style={{
          padding: '10px 24px',
          fontSize: '0.75rem',
          color: 'var(--text-tertiary)',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.04))',
        }}>
          {activeInfo.icon} {activeInfo.desc}
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
                {activeTab === 'pie' ? 'Calculating file distribution...' :
                 activeTab === 'sequence' ? 'Mapping data flow...' :
                 'Analyzing architecture...'}
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '4px' }}>
                {activeTab === 'pie' ? 'Counting files by language' :
                 'AI is analyzing your codebase'}
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
