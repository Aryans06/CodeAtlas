'use client';
import { useRef, useState } from 'react';

interface UploadModalProps {
  onClose: () => void;
  onUpload: (files: File[]) => void;
}

export default function UploadModal({ onClose, onUpload }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles(Array.from(incoming));
  };

  const handleConfirm = async () => {
    if (!files.length) return;
    setUploading(true);
    await onUpload(files);
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="modal-overlay" id="uploadModal" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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
          <div
            className="dropzone"
            id="dropzone"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="dropzone__icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 32V38C8 40.2 9.8 42 12 42H36C38.2 42 40 40.2 40 38V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="dropzone__text">Drag & drop files here</p>
            <p className="dropzone__hint">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              // @ts-ignore - webkitdirectory is not typed
              webkitdirectory=""
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="dropzone__file-list" style={{ display: 'block' }}>
              <div className="dropzone__file-list-header">
                <span>{files.length} files selected</span>
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
                {files.length > 20 && <li>...and {files.length - 20} more</li>}
              </ul>
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn--primary"
            disabled={!files.length || uploading}
            onClick={handleConfirm}
          >
            {uploading ? 'Indexing...' : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L6 11L12 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Upload Files
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
