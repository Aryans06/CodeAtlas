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

function TreeNode({ node, depth, filePath, onExplainFile }: { node: FileNode; depth: number; filePath: string; onExplainFile?: (path: string) => void }) {
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
              <TreeNode key={i} node={child} depth={depth + 1} filePath={filePath ? `${filePath}/${child.name}` : child.name} onExplainFile={onExplainFile} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="tree-item tree-item--file"
      style={{ paddingLeft: `${depth * 18 + 8}px`, justifyContent: 'space-between' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
        <FileIcon ext={ext} />
        <span className="tree-item__name">{node.name}</span>
      </div>
      {onExplainFile && (
        <button
          className="tree-item__explain-btn"
          title={`Explain ${node.name}`}
          onClick={(e) => { e.stopPropagation(); onExplainFile(filePath); }}
        >
          💡
        </button>
      )}
    </div>
  );
}

export interface SessionInfo {
  id: string;
  title: string;
  updated_at: string;
}

interface SidebarProps {
  fileTree: FileNode[];
  sessions: SessionInfo[];
  activeSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onExplainFile?: (filepath: string) => void;
}

export default function Sidebar({ fileTree, sessions, activeSessionId, onNewChat, onSelectSession, onDeleteSession, onExplainFile }: SidebarProps) {
  return (
    <aside className="sidebar" id="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Chat History Section */}
      <div className="sidebar__history" style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: '0', borderBottom: '1px solid var(--border)' }}>
        <div className="sidebar__header" style={{ paddingBottom: '0' }}>
          <h2 className="sidebar__title">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
              <path d="M2 4C2 2.89543 2.89543 2 4 2H12C13.1046 2 14 2.89543 14 4V10C14 11.1046 13.1046 12 12 12H6L2 15V4Z" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Chat History
          </h2>
          <button 
            onClick={onNewChat}
            style={{ marginTop: '12px', width: '100%', padding: '6px 12px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600, fontSize: '0.8rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            New Chat
          </button>
        </div>

        <div className="sidebar__tree" style={{ flex: '1', overflowY: 'auto', marginTop: '8px' }}>
          {sessions.length === 0 ? (
            <p className="sidebar__empty-hint" style={{ textAlign: 'center', marginTop: '20px' }}>No previous chats.</p>
          ) : (
            sessions.map(s => (
              <div 
                key={s.id} 
                className="tree-item" 
                style={{ 
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: s.id === activeSessionId ? 'rgba(251, 113, 133, 0.1)' : 'transparent',
                  borderLeft: s.id === activeSessionId ? '2px solid var(--accent)' : '2px solid transparent'
                }}
                onClick={() => onSelectSession(s.id)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span className="tree-item__name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
                  title="Delete Chat"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M3 4H13M5 4V3C5 2.45 5.45 2 6 2H10C10.55 2 11 2.45 11 3V4M6 7V11M10 7V11M4 4V13C4 13.55 4.45 14 5 14H11C11.55 14 12 13.55 12 13V4" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. File Explorer Section */}
      <div className="sidebar__files" style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: '0' }}>
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
            <p className="sidebar__empty-hint">Upload codebase to view files</p>
          </div>
        ) : (
          <div className="sidebar__tree" id="fileTree" style={{ flex: '1', overflowY: 'auto' }}>
            {fileTree.map((node, i) => (
              <TreeNode key={i} node={node} depth={0} filePath={node.name} onExplainFile={onExplainFile} />
            ))}
          </div>
        )}
      </div>

    </aside>
  );
}
