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
  async addChunks(userId: string, chunks: Chunk[], embeddings: { index: number; embedding: number[] | null }[]) {
    const supabase = getSupabase();
    
    const rows = [];
    for (let i = 0; i < chunks.length; i++) {
      const emb = embeddings.find(e => e.index === i);
      if (!emb?.embedding) continue;
      
      rows.push({
        user_id: userId,
        content: chunks[i].content,
        file: chunks[i].metadata.file,
        language: chunks[i].metadata.language,
        start_line: chunks[i].metadata.startLine,
        end_line: chunks[i].metadata.endLine,
        embedding: emb.embedding,
      });
    }

    if (rows.length === 0) return;

    // Supabase can bulk insert max ~1000 rows at a time comfortably. Batching might be needed if massive.
    // For safety, let's insert chunks in batches of 500
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

  async search(userId: string, queryEmbedding: number[], topK = 5) {
    const supabase = getSupabase();
    
    const { data, error } = await supabase.rpc('match_code_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.1, // accept anything above 10% similarity
      match_count: topK,
      p_user_id: userId
    });

    if (error) {
      console.error('Supabase Search Error:', error);
      throw new Error(`DB RPC Error: ${error.message}`);
    }

    // Structure matching existing expectations: Array of { chunk: { content, metadata... }, score }
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

  async clear(userId: string) {
    const supabase = getSupabase();
    const { error } = await supabase.from('code_chunks').delete().eq('user_id', userId);
    if (error) {
      console.error('Supabase Delete Error:', error);
      throw new Error(`DB Reset Error: ${error.message}`);
    }
    console.log(`🗑️ Database chunks cleared for user ${userId}`);
  },

  async getStatus(userId: string) {
    const supabase = getSupabase();
    // Fetch unique filenames across the user's chunks
    const { data: fileData, error: fileError } = await supabase
      .from('code_chunks')
      .select('file')
      .eq('user_id', userId);

    if (fileError) throw new Error(`DB Status Error: ${fileError.message}`);
    
    // De-duplicate the files since there are multiple chunks per file
    const uniqueFiles = Array.from(new Set((fileData || []).map(d => d.file)));

    return {
      isIndexed: uniqueFiles.length > 0,
      totalChunks: fileData?.length || 0,
      files: uniqueFiles
    };
  }
};
