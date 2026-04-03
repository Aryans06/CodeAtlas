import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

export function initEmbedder(apiKey: string) {
  genAI = new GoogleGenerativeAI(apiKey);
  console.log('🔗 Gemini embedder initialized');
}

// Embed a single text → returns number[]
export async function embedText(text: string): Promise<number[]> {
  if (!genAI) throw new Error('Embedder not initialized');

  // Use 'embedding-001' — universally available across all Gemini API keys
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  // Truncate to ~8000 chars to stay within token limits
  const truncated = text.length > 8000 ? text.slice(0, 8000) : text;

  const result = await model.embedContent(truncated);
  return result.embedding.values as number[];
}

// Embed multiple texts sequentially (rate-limit safe)
export async function embedBatch(
  texts: string[],
  onProgress?: (done: number, total: number) => void
): Promise<{ index: number; embedding: number[] | null }[]> {
  const results: { index: number; embedding: number[] | null }[] = [];

  for (let i = 0; i < texts.length; i++) {
    try {
      const embedding = await embedText(texts[i]);
      results.push({ index: i, embedding });
      onProgress?.(i + 1, texts.length);
    } catch (err: any) {
      console.error(`⚠️ Failed to embed chunk ${i}: ${err.message}`);
      results.push({ index: i, embedding: null });
    }
    // 100ms delay to stay well under rate limits
    if (i < texts.length - 1) await sleep(100);
  }

  console.log(`✅ Embedded ${results.filter(r => r.embedding).length}/${texts.length} chunks`);
  return results;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
