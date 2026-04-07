'use client';
import { useRef, useState } from 'react';

interface UploadModalProps {
  onClose: () => void;
  onUpload: (files: File[]) => void;
  onGitHubImport: (url: string) => void;
}

type Tab = 'local' | 'github';

export default function UploadModal({ onClose, onUpload, onGitHubImport }: UploadModalProps) {
  const [tab, setTab] = useState<Tab>('local');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergeFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const newFiles = Array.from(incoming);
    setFiles(prev => {
      const existing = new Set(prev.map(f => (f as any).webkitRelativePath || f.name));
      const unique = newFiles.filter(f => !existing.has((f as any).webkitRelativePath || f.name));
      return [...prev, ...unique];
    });
  };

  const handleLocalConfirm = async () => {
    if (!files.length) return;
    setUploading(true);
    setUploadProgress('Uploading...');
    if (files.length > 50) {
      setUploadProgress(`Uploading ${files.length} files in batches...`);
    }
    await onUpload(files);
    setUploading(false);
    setUploadProgress('');
  };

  const handleGitHubConfirm = async () => {
    if (!githubUrl.trim()) return;
    setUploading(true);
    setUploadProgress('Connecting to GitHub...');
    await onGitHubImport(githubUrl.trim());
    setUploading(false);
    setUploadProgress('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    mergeFiles(e.dataTransfer.files);
  };

  const totalSizeMB = (files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1);

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1,
    padding: '10px 16px',
    background: tab === t ? 'var(--accent)' : 'transparent',
    color: tab === t ? 'white' : 'var(--text-secondary)',
    border: tab === t ? 'none' : '1px solid var(--border)',
    borderRadius: t === 'local' ? '6px 0 0 6px' : '0 6px 6px 0',
    cursor: 'pointer',
    fontWeight: tab === t ? 600 : 400,
    fontSize: '0.85rem',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  });

  return (
    <div
      className="modal-overlay"
      id="uploadModal"
      style={{ display: 'flex' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">Import Codebase</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="modal__body">
          {/* Tab switcher */}
          <div style={{ display: 'flex', marginBottom: '16px' }}>
            <button style={tabStyle('local')} onClick={() => setTab('local')}>
              📁 Local Upload
            </button>
            <button style={tabStyle('github')} onClick={() => setTab('github')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.9 }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub Import
            </button>
          </div>

          {/* Local Upload Tab */}
          {tab === 'local' && (
            <>
              <div
                className="dropzone"
                id="dropzone"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="dropzone__icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 32V38C8 40.2 9.8 42 12 42H36C38.2 42 40 40.2 40 38V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="dropzone__text">Drag & drop files or folder here</p>
                <p className="dropzone__hint">or choose an option below</p>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  className="btn btn--ghost"
                  style={{ flex: 1 }}
                  onClick={() => folderInputRef.current?.click()}
                >
                  📁 Select Folder
                </button>
                <button
                  className="btn btn--ghost"
                  style={{ flex: 1 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  📄 Select Files
                </button>
              </div>

              {/* Hidden inputs */}
              <input
                ref={folderInputRef}
                type="file"
                multiple
                // @ts-ignore
                webkitdirectory=""
                style={{ display: 'none' }}
                onChange={(e) => mergeFiles(e.target.files)}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => mergeFiles(e.target.files)}
              />

              {/* File list preview */}
              {files.length > 0 && (
                <div className="dropzone__file-list" style={{ display: 'block', marginTop: '12px' }}>
                  <div className="dropzone__file-list-header">
                    <span>{files.length} files selected ({totalSizeMB} MB)</span>
                    <button className="btn btn--sm btn--ghost" onClick={() => setFiles([])}>Clear all</button>
                  </div>
                  <ul>
                    {files.slice(0, 20).map((f, i) => (
                      <li key={i}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 1h5l3 3v7a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1" />
                        </svg>
                        {(f as any).webkitRelativePath || f.name}
                      </li>
                    ))}
                    {files.length > 20 && <li>...and {files.length - 20} more files</li>}
                  </ul>
                  {files.length > 50 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '8px', padding: '0 8px' }}>
                      ⚠️ Large upload detected. Files &gt;500KB and binary files will be automatically skipped.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* GitHub Import Tab */}
          {tab === 'github' && (
            <>
              <div style={{
                padding: '24px',
                border: '1px dashed var(--border)',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                <svg width="48" height="48" viewBox="0 0 16 16" fill="var(--text-tertiary)" style={{ marginBottom: '12px', opacity: 0.4 }}>
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Paste a public GitHub repository URL
                </p>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleGitHubConfirm(); }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '10px' }}>
                  Supports formats: <code>github.com/owner/repo</code>, <code>github.com/owner/repo/tree/branch</code>
                </p>
              </div>
            </>
          )}

          {uploadProgress && (
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent)', marginTop: '8px' }}>
              {uploadProgress}
            </p>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          {tab === 'local' ? (
            <button
              className="btn btn--primary"
              disabled={!files.length || uploading}
              onClick={handleLocalConfirm}
            >
              {uploading ? (
                <span>Indexing<span style={{ animation: 'pulse 1s infinite' }}>...</span></span>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Upload & Index
                </>
              )}
            </button>
          ) : (
            <button
              className="btn btn--primary"
              disabled={!githubUrl.trim() || uploading}
              onClick={handleGitHubConfirm}
            >
              {uploading ? (
                <span>Cloning<span style={{ animation: 'pulse 1s infinite' }}>...</span></span>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  Clone & Index
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
