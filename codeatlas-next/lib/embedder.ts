import { HfInference } from '@huggingface/inference';

let hf: HfInference | null = null;

export function initEmbedder(apiKey: string) {
  hf = new HfInference(apiKey);
  console.log('🔗 HuggingFace embedder initialized');
}

export function isEmbedderReady(): boolean {
  return hf !== null;
}

// Embed a single text → returns number[]
export async function embedText(text: string): Promise<number[]> {
  if (!hf) throw new Error('Embedder not initialized');

  const truncated = text.length > 8000 ? text.slice(0, 8000) : text;

  // We use a high-quality free embedding model hosted on HuggingFace
  const response = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: truncated,
  });

  return response as number[];
}

// Embed multiple texts sequentially
export async function embedBatch(
  texts: string[],
  onProgress?: (done: number, total: number) => void
): Promise<{ index: number; embedding: number[] | null }[]> {
  const results: { index: number; embedding: number[] | null }[] = [];

  for (let i = 0; i < texts.length; i++) {
    try {
      const embedding = await embedText(texts[i]);
      results.push({ index: i, embedding });
    } catch (err: any) {
      console.error(`⚠️ Failed to embed chunk ${i}: ${err.message}`);
      results.push({ index: i, embedding: null });
    }
    
    // Slight delay to be polite to HF free tier
    if (i < texts.length - 1) await sleep(200);
    onProgress?.(i + 1, texts.length);
  }

  console.log(`✅ Embedded ${results.filter(r => r.embedding).length}/${texts.length} chunks`);
  return results;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
