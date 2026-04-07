'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import AmbientBackground from '@/components/AmbientBackground';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import ContextPanel from '@/components/ContextPanel';
import UploadModal from '@/components/UploadModal';
import ArchModal from '@/components/ArchModal';
import { useUser } from '@clerk/nextjs';
import type { SessionInfo } from '@/components/Sidebar';

export interface Source {
  file: string;
  startLine: number;
  endLine: number;
  score: number;
  preview: string;
}

export interface Message {
  role: 'user' | 'ai';
  content: string;
  sources?: Source[];
  time: string;
}

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  expanded?: boolean;
  children?: FileNode[];
}

export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [isIndexed, setIsIndexed] = useState(false);
  const [indexingMsg, setIndexingMsg] = useState('');
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showArchModal, setShowArchModal] = useState(false);
  const [archMermaid, setArchMermaid] = useState('');
  const [archFileCount, setArchFileCount] = useState(0);
  const [archLoading, setArchLoading] = useState(false);
  const { isSignedIn } = useUser();

  // Fetch History Sidebar items
  const loadSessions = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [isSignedIn]);

  // Handle clicking New Chat
  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setSources([]);
  };

  // Handle selecting a past session
  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setMessages([]);
    setSources([]);
    try {
      const res = await fetch(`/api/history?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        // Map database format to frontend format
        setMessages(data.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          sources: m.sources,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle deleting a session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await fetch(`/api/history?sessionId=${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Check DB status on mount or sign in
  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/status')
        .then(res => res.json())
        .then(data => {
          if (data.isIndexed) {
            setIsIndexed(true);
            setIndexingMsg(`✅ DB ready: ${data.totalChunks} chunks loaded`);
            if (data.files && data.files.length > 0) {
              setFileTree(buildFileTree(data.files));
            }
            setTimeout(() => setIndexingMsg(''), 3000);
          }
        })
        .catch(console.error);
        
      loadSessions();
    } else {
      setIsIndexed(false);
      setFileTree([]);
      setMessages([]);
      setSessions([]);
      setActiveSessionId(null);
    }
  }, [isSignedIn, loadSessions]);

  // Theme
  useEffect(() => {
    const saved = (localStorage.getItem('codeatlas-theme') as 'dark' | 'light') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('codeatlas-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  // Send a chat message (streaming)
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', content: text, time }]);
    setIsLoading(true);
    setSources([]);

    const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'ai', content: '', time: aiTime }]);

    // Track session
    let targetSessionId = activeSessionId;
    const isFirstMessage = !activeSessionId && messages.length === 0;

    try {
      // Create session on the fly if needed
      if (!targetSessionId) {
        const createRes = await fetch('/api/history', { method: 'POST' });
        if (createRes.ok) {
          const s = await createRes.json();
          targetSessionId = s.sessionId;
          setActiveSessionId(s.sessionId);
        }
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: text, 
          sessionId: targetSessionId,
          isFirstMessage 
        }),
      });

      if (!res.ok) {
        // Non-streaming error (auth, validation, etc.)
        const data = await res.json();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'ai',
            content: `⚠️ ${data.error || 'Something went wrong.'}`,
            time: aiTime,
          };
          return updated;
        });
        setIsLoading(false);
        return;
      }

      // Read the SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);

          if (payload === '[DONE]') break;

          try {
            const parsed = JSON.parse(payload);

            if (parsed.token) {
              // Append the token to the last (AI) message
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + parsed.token };
                return updated;
              });
            }

            if (parsed.sources) {
              // Attach sources to the AI message
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], sources: parsed.sources };
                return updated;
              });
              setSources(parsed.sources);
            }

            if (parsed.error) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + `\n\n⚠️ ${parsed.error}`,
                };
                return updated;
              });
            }
          } catch {
            // Ignore malformed JSON lines
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'ai',
          content: `❌ Network error: ${err.message}`,
          time: aiTime,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
      if (isFirstMessage) loadSessions(); // Refresh Sidebar list instantly to show new chat
    }
  }, [isLoading, activeSessionId, messages.length, loadSessions]);

  // Upload files
  const handleUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    setIndexingMsg('Indexing...');

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setIsIndexed(true);
        setIndexingMsg(`✅ Indexed ${data.stats.chunksCreated} chunks`);
        setFileTree(buildFileTree(files.map(f => (f as any).webkitRelativePath || f.name)));
        setShowModal(false);
        setTimeout(() => setIndexingMsg(''), 3000);
      } else {
        setIndexingMsg(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setIndexingMsg(`❌ ${err.message}`);
    }
  }, []);

  // GitHub import
  const handleGitHubImport = useCallback(async (url: string) => {
    setIndexingMsg('🐙 Fetching from GitHub...');
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsIndexed(true);
        setIndexingMsg(`✅ Imported ${data.repoName}: ${data.stats.chunksCreated} chunks from ${data.stats.filesProcessed} files`);
        // Rebuild file tree from the stats
        if (data.stats.files && data.stats.files.length > 0) {
          setFileTree(buildFileTree(data.stats.files));
        } else {
          // Fallback: fetch status to get file list
          const statusRes = await fetch('/api/status');
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.files) setFileTree(buildFileTree(statusData.files));
          }
        }
        setShowModal(false);
        setTimeout(() => setIndexingMsg(''), 4000);
      } else {
        setIndexingMsg(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setIndexingMsg(`❌ ${err.message}`);
    }
  }, []);

  return (
    <>
      <AmbientBackground />
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onUploadClick={() => setShowModal(true)}
        onVisualizeClick={async () => {
          setShowArchModal(true);
          setArchLoading(true);
          setArchMermaid('');
          try {
            const res = await fetch('/api/visualize', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
              setArchMermaid(data.mermaid);
              setArchFileCount(data.fileCount);
            } else {
              setArchMermaid(`graph TD\n  A["Error: ${data.error}"]`);
            }
          } catch (err: any) {
            setArchMermaid(`graph TD\n  A["Error: ${err.message}"]`);
          } finally {
            setArchLoading(false);
          }
        }}
        indexingMsg={indexingMsg}
        isIndexed={isIndexed}
      />
      <main className="app" id="app">
        <Sidebar 
          fileTree={fileTree} 
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onExplainFile={async (filepath) => {
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setMessages(prev => [
              ...prev,
              { role: 'user', content: `💡 Explain file: ${filepath}`, time },
              { role: 'ai', content: '', time },
            ]);
            setIsLoading(true);
            try {
              const res = await fetch('/api/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filepath }),
              });
              const data = await res.json();
              if (res.ok) {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'ai', content: data.explanation, time };
                  return updated;
                });
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'ai', content: `❌ ${data.error}`, time };
                  return updated;
                });
              }
            } catch (err: any) {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'ai', content: `❌ ${err.message}`, time };
                return updated;
              });
            } finally {
              setIsLoading(false);
            }
          }}
        />
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          hasCodebase={isIndexed}
        />
        <ContextPanel sources={sources} />
      </main>
      {showModal && (
        <UploadModal
          onClose={() => setShowModal(false)}
          onUpload={handleUpload}
          onGitHubImport={handleGitHubImport}
        />
      )}
      {showArchModal && (
        <ArchModal
          mermaidCode={archMermaid}
          fileCount={archFileCount}
          isLoading={archLoading}
          onClose={() => setShowArchModal(false)}
        />
      )}
    </>
  );
}

function buildFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = [];
  paths.forEach(p => {
    const parts = p.split('/').filter(Boolean);
    let level = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      let node = level.find(n => n.name === part);
      if (!node) {
        node = { name: part, type: isFile ? 'file' : 'folder', expanded: i === 0 };
        if (!isFile) node.children = [];
        level.push(node);
      }
      if (!isFile) level = node.children!;
    });
  });
  const sort = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => n.children && sort(n.children));
  };
  sort(root);
  return root;
}
