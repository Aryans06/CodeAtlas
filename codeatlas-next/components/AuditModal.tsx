'use client';
import { useEffect, useState } from 'react';

interface Finding {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  file: string;
  line: string;
  description: string;
  fix: string;
}

interface AuditModalProps {
  onClose: () => void;
}

const severityConfig = {
  critical: { emoji: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', label: 'Critical' },
  warning: { emoji: '🟡', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', label: 'Warning' },
  info: { emoji: '🔵', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.25)', label: 'Info' },
};

export default function AuditModal({ onClose }: AuditModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [scannedCategories, setScannedCategories] = useState(0);

  useEffect(() => {
    const runAudit = async () => {
      try {
        const res = await fetch('/api/audit', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          setFindings(data.findings || []);
          setSummary(data.summary || '');
          setScannedCategories(data.scannedCategories || 0);
        } else {
          setError(data.error || 'Audit failed');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    runAudit();
  }, []);

  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;
  const infoCount = findings.filter(f => f.severity === 'info').length;

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
        width: '90vw',
        maxWidth: '750px',
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
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.07))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>🛡️</span>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Security Audit
            </h2>
            {!isLoading && !error && (
              <span style={{
                fontSize: '0.65rem',
                padding: '2px 8px',
                background: findings.length === 0 ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)',
                color: findings.length === 0 ? '#34d399' : '#fb7185',
                borderRadius: '10px',
                fontWeight: 600,
              }}>
                {findings.length === 0 ? '✓ Clean' : `${findings.length} issues`}
              </span>
            )}
          </div>
          <button onClick={onClose} className="btn btn--ghost" style={{ padding: '5px 8px' }} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '3px solid var(--border)',
                borderTopColor: '#ef4444',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }} />
              <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600 }}>
                Running security audit...
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', marginTop: '6px' }}>
                Scanning 6 threat categories with semantic search + AI analysis
              </p>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                justifyContent: 'center',
                marginTop: '20px',
              }}>
                {['Secrets', 'Injection', 'XSS', 'Auth', 'Data Exposure', 'Config'].map((cat, i) => (
                  <span key={cat} style={{
                    fontSize: '0.7rem',
                    padding: '3px 10px',
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: '12px',
                    color: '#fb7185',
                    animation: `fadeUp 0.3s ease ${i * 0.1}s both`,
                  }}>
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>❌ {error}</p>
            </div>
          ) : (
            <>
              {/* Summary Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 18px',
                background: findings.length === 0 ? 'rgba(52,211,153,0.06)' : 'rgba(239,68,68,0.04)',
                border: `1px solid ${findings.length === 0 ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.15)'}`,
                borderRadius: '10px',
                marginBottom: '20px',
              }}>
                <span style={{ fontSize: '1.5rem' }}>{findings.length === 0 ? '✅' : '⚠️'}</span>
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{summary}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                    Scanned {scannedCategories} threat categories using semantic vector search
                  </p>
                </div>
              </div>

              {/* Severity Counters */}
              {findings.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { count: criticalCount, ...severityConfig.critical },
                    { count: warningCount, ...severityConfig.warning },
                    { count: infoCount, ...severityConfig.info },
                  ].map(s => (
                    <div key={s.label} style={{
                      flex: 1,
                      padding: '12px',
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.count}</span>
                      <p style={{ fontSize: '0.7rem', color: s.color, margin: '2px 0 0', fontWeight: 500 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Findings List */}
              {findings.map((finding, i) => {
                const config = severityConfig[finding.severity] || severityConfig.info;
                return (
                  <div key={i} style={{
                    padding: '14px 16px',
                    background: config.bg,
                    border: `1px solid ${config.border}`,
                    borderRadius: '10px',
                    marginBottom: '10px',
                    animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span>{config.emoji}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{finding.title}</span>
                      <span style={{
                        fontSize: '0.6rem',
                        padding: '1px 6px',
                        background: config.border,
                        color: config.color,
                        borderRadius: '6px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}>
                        {config.label}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>
                      {finding.description}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '0.7rem',
                      color: 'var(--text-tertiary)',
                      marginBottom: '8px',
                    }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>📄 {finding.file}</span>
                      {finding.line && <span style={{ fontFamily: 'var(--font-mono)' }}>L{finding.line}</span>}
                    </div>
                    <div style={{
                      padding: '8px 12px',
                      background: 'rgba(52,211,153,0.06)',
                      border: '1px solid rgba(52,211,153,0.15)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#34d399',
                    }}>
                      💡 <strong>Fix:</strong> {finding.fix}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
