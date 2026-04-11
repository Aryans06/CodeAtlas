import { createClient } from '@supabase/supabase-js';

interface Chunk {
  content: string;
  metadata: {
    file: string;
    language: string;
    startLine: number;
    endLine: number;
    type: string;
  };
}

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase coordinates missing in .env.local: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
};

export const vectorStore = {
  async addChunks(userId: string, repoName: string, chunks: Chunk[], embeddings: { index: number; embedding: number[] | null }[]) {
    const supabase = getSupabase();
    
    const rows = [];
    for (let i = 0; i < chunks.length; i++) {
      const emb = embeddings.find(e => e.index === i);
      if (!emb?.embedding) continue;
      
      rows.push({
        user_id: userId,
        content: chunks[i].content,
        file: chunks[i].metadata.file,
        repo_name: repoName,
        language: chunks[i].metadata.language,
        start_line: chunks[i].metadata.startLine,
        end_line: chunks[i].metadata.endLine,
        embedding: emb.embedding,
      });
    }

    if (rows.length === 0) return;


    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('code_chunks').insert(batch);
      if (error) {
        console.error('Supabase Insert Error:', error);
        throw new Error(`DB Error: ${error.message}`);
      }
    }
    
    console.log(`📊 Supabase: ${rows.length} entries indexed for user ${userId}`);
  },

  async search(userId: string, repoName: string, queryEmbedding: number[], topK = 5) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase.rpc('match_code_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.1,
      match_count: topK,
      p_user_id: userId,
      p_repo_name: repoName || 'default'
    });

    if (error) {
      console.error('Supabase Search Error:', error);
      throw new Error(`DB RPC Error: ${error.message}`);
    }


    return (data || []).map((row: any) => ({
      chunk: {
        content: row.content,
        metadata: {
          file: row.file,
          startLine: row.start_line,
          endLine: row.end_line
        }
      },
      score: row.score
    }));
  },

  async clear(userId: string, repoName: string) {
    const supabase = getSupabase();

    const { error } = await supabase.from('code_chunks').delete().eq('user_id', userId).eq('repo_name', repoName);
    if (error) {
      console.error('Supabase Delete Error:', error);
      throw new Error(`DB Reset Error: ${error.message}`);
    }
    console.log(`🗑️ Database chunks cleared for user ${userId}`);
  },

  async getStatus(userId: string, currentRepoUrlQuery?: string) {
    const supabase = getSupabase();


    const { data: reposData, error: reposError } = await supabase
      .from('code_chunks')
      .select('repo_name')
      .eq('user_id', userId);

    if (reposError) throw new Error(`DB Repos Error: ${reposError.message}`);
    const availableRepos = Array.from(new Set((reposData || []).map(r => r.repo_name)));

    if (availableRepos.length === 0) {
      return { isIndexed: false, totalChunks: 0, files: [], availableRepos: [], currentRepo: null };
    }


    const targetRepo = currentRepoUrlQuery && availableRepos.includes(currentRepoUrlQuery)
      ? currentRepoUrlQuery
      : availableRepos[0];


    const { data: fileData, error: fileError } = await supabase
      .from('code_chunks')
      .select('file')
      .eq('user_id', userId)
      .eq('repo_name', targetRepo);

    if (fileError) throw new Error(`DB Status Error: ${fileError.message}`);
    

    const uniqueFiles = Array.from(new Set((fileData || []).map(d => d.file)));

    return {
      isIndexed: uniqueFiles.length > 0,
      totalChunks: fileData?.length || 0,
      files: uniqueFiles,
      availableRepos,
      currentRepo: targetRepo
    };
  }
};
