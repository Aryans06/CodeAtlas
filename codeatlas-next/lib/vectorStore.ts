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

interface Entry {
  id: string;
  embedding: number[];
  chunk: Chunk;
}

class VectorStore {
  entries: Entry[] = [];
  isIndexed = false;

  addChunks(chunks: Chunk[], embeddings: { index: number; embedding: number[] | null }[]) {
    for (let i = 0; i < chunks.length; i++) {
      const emb = embeddings.find(e => e.index === i);
      if (!emb?.embedding) continue;
      this.entries.push({
        id: `chunk_${this.entries.length}`,
        embedding: emb.embedding,
        chunk: chunks[i],
      });
    }
    this.isIndexed = true;
    console.log(`📊 Vector store: ${this.entries.length} entries indexed`);
  }

  search(queryEmbedding: number[], topK = 5) {
    if (!this.entries.length) return [];
    const scored = this.entries.map(entry => ({
      chunk: entry.chunk,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  getStats() {
    const files = new Set(this.entries.map(e => e.chunk.metadata.file));
    return {
      totalChunks: this.entries.length,
      totalFiles: files.size,
      files: [...files],
      isIndexed: this.isIndexed,
    };
  }

  clear() {
    this.entries = [];
    this.isIndexed = false;
    console.log('🗑️ Vector store cleared');
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export const vectorStore = new VectorStore();
