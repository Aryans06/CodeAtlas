import { HfInference } from '@huggingface/inference';

let hf: HfInference | null = null;

export function initEmbedder(apiKey: string) {
  hf = new HfInference(apiKey);
  console.log('🔗 HuggingFace embedder initialized');
}

export function isEmbedderReady(): boolean {
  return hf !== null;
}


export async function embedText(text: string): Promise<number[]> {
  if (!hf) throw new Error('Embedder not initialized');

  const truncated = text.length > 8000 ? text.slice(0, 8000) : text;

  const response = await hf.featureExtraction({
    model: 'sentence-transformers/all-MiniLM-L6-v2',
    inputs: truncated,
    provider: 'hf-inference',
  });

  return response as number[];
}


export async function embedBatch(
  texts: string[],
  onProgress?: (done: number, total: number) => void
): Promise<{ index: number; embedding: number[] | null }[]> {
  const results: { index: number; embedding: number[] | null }[] = [];
  

  const BATCH_SIZE = 25; 

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (text, j) => {
        const embedding = await embedText(text);
        return { index: i + j, embedding };
      })
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
      } else {
        const failedIndex = i + batchResults.indexOf(r);
        console.error(`⚠️ Failed to embed chunk ${failedIndex}:`, r.reason?.message || 'Unknown error');
        results.push({ index: failedIndex, embedding: null });
      }
    }


    if (i + BATCH_SIZE < texts.length) await sleep(100);

    const done = Math.min(i + BATCH_SIZE, texts.length);
    if (onProgress) onProgress(done, texts.length);
    console.log(`📊 Embedding progress: ${done}/${texts.length}`);
  }

  console.log(`✅ Embedded ${results.filter(r => r.embedding).length}/${texts.length} chunks`);
  return results;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
