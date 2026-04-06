import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase coordinates missing in .env.local: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
};

export const chatHistory = {
  async createSession(userId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, title: 'New Chat' })
      .select('id')
      .single();
    
    if (error) throw new Error(`Create session failed: ${error.message}`);
    return data.id;
  },

  async listSessions(userId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`List sessions failed: ${error.message}`);
    return data || [];
  },

  async getMessages(sessionId: string, userId: string) {
    const supabase = getSupabase();
    // Verify ownership first for security
    const { data: sessionData } = await supabase
      .from('chat_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();
      
    if (!sessionData || sessionData.user_id !== userId) {
      throw new Error('Unauthorized or session not found');
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content, sources, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Get messages failed: ${error.message}`);
    return data || [];
  },

  async saveMessage(sessionId: string, role: 'user' | 'ai', content: string, sources?: any) {
    const supabase = getSupabase();
    
    const { error: msgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        sources: sources || null
      });

    if (msgError) throw new Error(`Save message failed: ${msgError.message}`);

    // Update the session's updated_at timestamp so it jumps to top
    await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
  },

  async updateSessionTitle(sessionId: string, title: string) {
    const supabase = getSupabase();
    await supabase
      .from('chat_sessions')
      .update({ title: title.slice(0, 50) + (title.length > 50 ? '...' : '') })
      .eq('id', sessionId);
  },

  async deleteSession(sessionId: string, userId: string) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);
      
    if (error) throw new Error(`Delete session failed: ${error.message}`);
  }
};
