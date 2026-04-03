// ═══════════════════════════════════════════════════════════
//  CodeAtlas — In-Memory Vector Store
//
//  PURPOSE: Store code chunk embeddings and find the most
//  similar ones when the user asks a question.
//
//  HOW SIMILARITY SEARCH WORKS:
//  
//  1. Each code chunk has an embedding (vector of 768 numbers)
//  2. The user's question also gets embedded into a vector
//  3. We compute "cosine similarity" between the question vector
//     and EVERY stored chunk vector
//  4. Return the top N most similar chunks
//
//  COSINE SIMILARITY measures the angle between two vectors:
//    - cos(θ) = 1.0  → identical meaning
//    - cos(θ) = 0.0  → completely unrelated
//    - cos(θ) = -1.0 → opposite meaning
// ═══════════════════════════════════════════════════════════

class VectorStore {
  constructor() {
    // Each entry: { id, embedding, chunk: { content, metadata } }
    this.entries = [];
    this.isIndexed = false;
  }

  // ─── Add Chunks with Their Embeddings ───
  //
  // chunks:     [{ content, metadata: { file, startLine, ... } }]
  // embeddings: [{ index, embedding: [0.12, -0.34, ...] }]
  //
  addChunks(chunks, embeddings) {
    for (let i = 0; i < chunks.length; i++) {
      const emb = embeddings.find(e => e.index === i);
      if (!emb || !emb.embedding) continue; // skip failed embeddings

      this.entries.push({
        id: `chunk_${this.entries.length}`,
        embedding: emb.embedding,
        chunk: chunks[i],
      });
    }

    this.isIndexed = true;
    console.log(`📊 Vector store: ${this.entries.length} entries indexed`);
  }

  // ─── Search for Similar Chunks ───
  //
  // queryEmbedding: the embedded question vector
  // topK:           how many results to return (default 5)
  //
  // Returns the most relevant code chunks, sorted by similarity
  //
  search(queryEmbedding, topK = 5) {
    if (this.entries.length === 0) {
      return [];
    }

    // Score every entry against the query
    const scored = this.entries.map(entry => ({
      chunk: entry.chunk,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    // Sort by similarity (highest first) and return top K
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  // ─── Get Stats ───
  getStats() {
    const files = new Set(this.entries.map(e => e.chunk.metadata.file));
    return {
      totalChunks: this.entries.length,
      totalFiles: files.size,
      files: [...files],
      isIndexed: this.isIndexed,
    };
  }

  // ─── Clear All Data ───
  clear() {
    this.entries = [];
    this.isIndexed = false;
    console.log('🗑️  Vector store cleared');
  }
}

// ═══ Cosine Similarity ═══
//
// The core math behind semantic search.
//
// Formula: cos(θ) = (A · B) / (|A| × |B|)
//
// Where:
//   A · B  = sum of (a[i] * b[i]) for all dimensions  (dot product)
//   |A|    = sqrt(sum of a[i]²)                        (magnitude)
//
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

// Single global instance
const vectorStore = new VectorStore();

export { vectorStore, cosineSimilarity };
