'use client';
import { useRef, useState } from 'react';

interface UploadModalProps {
  onClose: () => void;
  onUpload: (files: File[]) => void;
}

export default function UploadModal({ onClose, onUpload }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
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

  const handleConfirm = async () => {
    if (!files.length) return;
    setUploading(true);
    setUploadProgress('Uploading...');

    // Upload in batches of 50 to avoid payload limits
    const BATCH_SIZE = 50;
    if (files.length > BATCH_SIZE) {
      setUploadProgress(`Uploading ${files.length} files in batches...`);
    }

    await onUpload(files);
    setUploading(false);
    setUploadProgress('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    mergeFiles(e.dataTransfer.files);
  };

  const totalSizeMB = (files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1);

  return (
    <div
      className="modal-overlay"
      id="uploadModal"
      style={{ display: 'flex' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">Upload Codebase</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="modal__body">
          {/* Drop zone */}
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

          {/* Two buttons: folder + files */}
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
                  ⚠️ Large upload detected. Files &gt;500KB and binary files will be automatically skipped. Files beyond 50MB total will be cut off.
                </p>
              )}
            </div>
          )}

          {uploadProgress && (
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent)', marginTop: '8px' }}>
              {uploadProgress}
            </p>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn--primary"
            disabled={!files.length || uploading}
            onClick={handleConfirm}
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
        </div>
      </div>
    </div>
  );
}
