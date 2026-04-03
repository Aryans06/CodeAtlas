'use client';
import { useState } from 'react';
import type { FileNode } from '@/app/page';

function FileIcon({ ext }: { ext: string }) {
  const colors: Record<string, string> = {
    js: '#F7DF1E', ts: '#3178C6', tsx: '#61DAFB', jsx: '#61DAFB',
    py: '#3776AB', json: '#8BC34A', css: '#1572B6', html: '#E44D26',
    md: '#083FA1', go: '#00ACD7', rs: '#CE412B',
  };
  const color = colors[ext] || 'var(--text-tertiary)';
  return (
    <span className="tree-item__icon" style={{ color }}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.1" />
        <path d="M8.5 1.5V4H11" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    </span>
  );
}

function TreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [expanded, setExpanded] = useState(node.expanded ?? false);
  const ext = node.name.split('.').pop() || '';

  if (node.type === 'folder') {
    return (
      <div>
        <div
          className="tree-item tree-item--folder"
          style={{ paddingLeft: `${depth * 18 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="tree-item__icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d={expanded ? 'M2 5L7 10L12 5' : 'M5 2L10 7L5 12'} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
          <span className="tree-item__icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.5 2.5C1.5 2.22 1.72 2 2 2H5.09C5.22 2 5.35 2.05 5.44 2.15L6.35 3.06C6.45 3.15 6.57 3.21 6.71 3.21H12C12.28 3.21 12.5 3.43 12.5 3.71V11.5C12.5 11.78 12.28 12 12 12H2C1.72 12 1.5 11.78 1.5 11.5V2.5Z" stroke="currentColor" strokeWidth="1.1" fill={expanded ? 'var(--warning)' : 'none'} fillOpacity={expanded ? 0.15 : 0} />
            </svg>
          </span>
          <span className="tree-item__name">{node.name}</span>
        </div>
        {expanded && node.children && (
          <div>
            {node.children.map((child, i) => (
              <TreeNode key={i} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="tree-item tree-item--file"
      style={{ paddingLeft: `${depth * 18 + 8}px` }}
    >
      <FileIcon ext={ext} />
      <span className="tree-item__name">{node.name}</span>
    </div>
  );
}

interface SidebarProps {
  fileTree: FileNode[];
}

export default function Sidebar({ fileTree }: SidebarProps) {
  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar__header">
        <h2 className="sidebar__title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 3C2 2.44772 2.44772 2 3 2H6.17C6.44 2 6.69 2.11 6.88 2.29L7.71 3.12C7.89 3.31 8.15 3.41 8.41 3.41H13C13.55 3.41 14 3.86 14 4.41V13C14 13.55 13.55 14 13 14H3C2.45 14 2 13.55 2 13V3Z" stroke="currentColor" strokeWidth="1.3" />
          </svg>{' '}
          Explorer
        </h2>
      </div>
      {fileTree.length === 0 ? (
        <div className="sidebar__empty" id="sidebarEmpty">
          <div className="sidebar__empty-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
              <path d="M16 18H32M16 24H28M16 30H24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
              <circle cx="36" cy="36" r="10" fill="var(--accent)" opacity="0.15" />
              <path d="M33 36H39M36 33V39" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="sidebar__empty-text">No codebase loaded</p>
          <p className="sidebar__empty-hint">Upload files or drag & drop a folder</p>
        </div>
      ) : (
        <div className="sidebar__tree" id="fileTree">
          {fileTree.map((node, i) => (
            <TreeNode key={i} node={node} depth={0} />
          ))}
        </div>
      )}
    </aside>
  );
}
