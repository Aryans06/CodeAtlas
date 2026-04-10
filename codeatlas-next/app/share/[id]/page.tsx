import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import ChatPanel from '@/components/ChatPanel';
import AmbientBackground from '@/components/AmbientBackground';

// Setup Supabase service role client
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase coordinates missing in .env.local');
  }
  return createClient(url, key);
};

export default async function SharedSnippetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('shared_snippets')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <div className="layout" data-theme="dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AmbientBackground />
      
      <header style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Code<span style={{ color: '#ef4444' }}>Atlas</span>
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)' }}>
            Shared Codebase Snippet
          </span>
        </div>
        <div>
          <a href="/" style={{
            background: 'var(--primary)',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 500
          }}>
            Analyze your own codebase
          </a>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: '1000px', padding: '2rem 1rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>{data.title}</h1>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Repository: <strong style={{ color: 'var(--text-primary)' }}>{data.repo_name}</strong> • Shared on {new Date(data.created_at).toLocaleDateString()}
              </p>
            </div>
            
            <div style={{ 
              flex: 1, 
              background: 'var(--surface-color)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <ChatPanel 
                messages={data.messages} 
                isLoading={false} 
                onSendMessage={() => {}} 
                hasCodebase={true} 
                isReadOnly={true}
              />
            </div>
        </div>
      </main>
    </div>
  );
}
