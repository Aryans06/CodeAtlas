'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import AmbientBackground from '@/components/AmbientBackground';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ChatPanel from '@/components/ChatPanel';
import ContextPanel from '@/components/ContextPanel';
import UploadModal from '@/components/UploadModal';
import { useUser } from '@clerk/nextjs';

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
  const { isSignedIn } = useUser();

  // Check DB status on mount or sign in
  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/status')
        .then(res => res.json())
        .then(data => {
          if (data.isIndexed) {
            setIsIndexed(true);
            setIndexingMsg(`✅ DB ready: ${data.totalChunks} chunks loaded`);
            // Rebuild the file tree sidebar here using the actual Supabase files
            if (data.files && data.files.length > 0) {
              setFileTree(buildFileTree(data.files));
            }
            setTimeout(() => setIndexingMsg(''), 3000);
          }
        })
        .catch(console.error);
    } else {
      setIsIndexed(false);
      setFileTree([]);
      setMessages([]);
    }
  }, [isSignedIn]);

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

  // Send a chat message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', content: text, time }]);
    setIsLoading(true);
    setSources([]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (!res.ok) {
        setMessages(prev => [
          ...prev,
          { role: 'ai', content: `⚠️ ${data.error || 'Something went wrong.'}`, time: aiTime },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'ai', content: data.answer, sources: data.sources, time: aiTime },
        ]);
        if (data.sources?.length) setSources(data.sources);
      }
    } catch (err: any) {
      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
        ...prev,
        { role: 'ai', content: `❌ Network error: ${err.message}`, time: aiTime },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

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

  return (
    <>
      <AmbientBackground />
      <Navbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onUploadClick={() => setShowModal(true)}
        indexingMsg={indexingMsg}
        isIndexed={isIndexed}
      />
      <main className="app" id="app">
        <Sidebar fileTree={fileTree} />
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
