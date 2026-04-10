'use client';
import { useState } from 'react';
import type { FileNode } from '@/app/page';

function FileIcon({ ext }: { ext: string }) {
  if (['js', 'jsx'].includes(ext)) {
    return (
      <span className="tree-item__icon" style={{ color: '#F7DF1E' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.01 2.011a3.195 3.195 0 0 0-3.193 3.193v13.592a3.193 3.193 0 0 0 3.193 3.193h10.978v-3.193H12.01V5.204h10.978V2.01H12.01zM4 2.011H2.01v19.978H4V2.011z"/>
        </svg>
      </span>
    );
  } else if (['ts', 'tsx'].includes(ext)) {
    return (
      <span className="tree-item__icon" style={{ color: '#3178C6' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M1.325 0v24h21.35V0H1.325zM12.63 19.53c-1.55 0-2.88-.36-3.99-1.09l1.1-2.07c.88.58 1.94 1 3 1 1.48 0 2.1-.63 2.1-1.39 0-1-.87-1.35-2.28-1.92-2-.84-3.52-1.77-3.52-3.8 0-1.94 1.39-3.48 3.8-3.48 1.45 0 2.61.39 3.51.87l-.93 2.03c-.68-.42-1.61-.74-2.61-.74-1.22 0-1.84.64-1.84 1.35 0 .87.87 1.25 2.51 1.96 2.03.87 3.25 1.9 3.25 3.83 0 2.22-1.48 3.45-4.06 3.45zm-6.27-1.56v-9.39h3.45V6.76H1.1v1.83h3.45v9.39h1.81z"/>
        </svg>
      </span>
    );
  } else if (ext === 'py') {
    return (
      <span className="tree-item__icon" style={{ color: '#3776AB' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.254 0A12.215 12.215 0 0 0 2 11.967c0 5.485 3.655 10.15 8.653 11.602l.607-1.745c-.328-.109-.64-.246-.926-.416V16.89c0-.462.378-.838.841-.838H14.1l1.767-5.076a2.02 2.02 0 0 0-.071-1.486L13.15 4.771A2.083 2.083 0 0 0 11.854 3.7a2.083 2.083 0 0 0-1.802.164L5.807 6.305A2.079 2.079 0 0 0 4.7 7.778v8.423a8.683 8.683 0 0 1-1.86-5.466A9.412 9.412 0 0 1 12.252 2.8c4.225 0 7.85 2.766 9.07 6.55H14.54a2.801 2.801 0 0 0-2.66 1.905l-2.025 5.86H8.22a1.365 1.365 0 0 0-1.362 1.363v4.545a11.956 11.956 0 0 0 5.39.231V19.49c0-.463.376-.838.842-.838h4.417c2.392 0 4.41-1.875 4.5-4.265a6.007 6.007 0 0 0-6.002-6.196h-1.92L16.273 2.45A12.2 12.2 0 0 0 12.254 0z"/>
        </svg>
      </span>
    );
  } else if (ext === 'md') {
    return (
      <span className="tree-item__icon" style={{ color: '#083FA1' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.579 6.27c-.89-1.258-2.22-2.046-3.714-2.23-1.616-.2-3.155.201-4.484 1.134-1.325.932-2.128 2.302-2.33 3.916l1.393 1.394c0-.986.388-1.916 1.054-2.583.829-.828 2.07-1.127 3.32-.792 1.25.334 2.196 1.282 2.531 2.532.335 1.25.035 2.491-.793 3.32-.667.666-1.597 1.054-2.583 1.054a1.868 1.868 0 0 1-1.394-.555l-1.393 1.394c.54.54 1.173.962 1.871 1.252a5.45 5.45 0 0 0 4.148 0c.698-.29 1.33-.712 1.87-1.252a3.655 3.655 0 0 0 1.055-2.583 3.655 3.655 0 0 0-1.055-2.583zM10.871 4.51c-1.329-.933-2.868-1.334-4.484-1.134-1.494.184-2.824.972-3.714 2.23-1.066 1.505-1.439 3.42-1.055 5.39.336 1.705 1.488 3.09 3.09 3.738 1.332.538 2.825.437 4.093-.277.625-.353 1.189-.838 1.636-1.42 1.066-1.505 1.439-3.42 1.055-5.39-.202-1.614-1.005-2.984-2.33-3.916H10.87zm-1.871 8.748a1.868 1.868 0 0 1-1.394.555c-.986 0-1.916-.388-2.583-1.054-.829-.828-1.127-2.07-.792-3.32.335-1.25 1.28-2.196 2.53-2.531 1.25-.335 2.492-.036 3.32.792.83.83 1.146 2.075.836 3.33-.31 1.257-1.272 2.2-2.522 2.51H9zM12 18h9.6v1.2H12v-1.2z"/>
        </svg>
      </span>
    );
  } else if (['json', 'yml', 'yaml', 'toml'].includes(ext)) {
    return (
      <span className="tree-item__icon" style={{ color: '#8BC34A' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </span>
    );
  } else {
    return (
      <span className="tree-item__icon" style={{ color: 'var(--text-tertiary)' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.1" />
          <path d="M8.5 1.5V4H11" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      </span>
    );
  }
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
  sessions: SessionInfo[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  fileTree: FileNode[];
  onExplainFile: (path: string) => void;
  onGenerateReadme: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  fileTree,
  onExplainFile,
  onGenerateReadme
}: SidebarProps) {
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
        <div className="sidebar__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="sidebar__title">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 3C2 2.44772 2.44772 2 3 2H6.17C6.44 2 6.69 2.11 6.88 2.29L7.71 3.12C7.89 3.31 8.15 3.41 8.41 3.41H13C13.55 3.41 14 3.86 14 4.41V13C14 13.55 13.55 14 13 14H3C2.45 14 2 13.55 2 13V3Z" stroke="currentColor" strokeWidth="1.3" />
            </svg>{' '}
            Explorer
          </h2>
          {fileTree.length > 0 && (
            <button 
              onClick={onGenerateReadme}
              style={{ background: 'transparent', border: '1px solid rgba(167, 139, 250, 0.3)', color: '#a78bfa', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Generate README"
            >
              📄 README
            </button>
          )}
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
