// ═══════════════════════════════════════════════════════════
//  CodeAtlas — Embedding Generator (Gemini API)
//
//  PURPOSE: Convert text (code chunks or questions) into
//  numerical vectors (embeddings) using Google's Gemini API.
//
//  WHAT IS AN EMBEDDING?
//  An embedding is a list of numbers (e.g. 768 floats) that 
//  represents the "meaning" of text. Similar text produces 
//  similar numbers:
//
//    "function login(email, password)"  → [0.12, -0.34, ...]
//    "authenticate user credentials"   → [0.11, -0.33, ...]  ← similar!
//    "render button component"         → [0.89,  0.12, ...]  ← different!
//
//  We use these to find code that's SEMANTICALLY similar to
//  a user's question, even if they use different words.
// ═══════════════════════════════════════════════════════════

import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function initEmbedder(apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  console.log('🔗 Gemini embedder initialized');
}

// ─── Embed a Single Text ───
//
// Calls Gemini's embedding model to convert text → vector.
// Returns an array of floats (the embedding).
//
async function embedText(text) {
  if (!genAI) throw new Error('Embedder not initialized. Call initEmbedder(apiKey) first.');

  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  // Truncate very long text (Gemini has token limits)
  const truncated = text.length > 8000 ? text.slice(0, 8000) : text;

  const result = await model.embedContent(truncated);
  return result.embedding.values; // returns Float32Array or number[]
}

// ─── Embed Multiple Texts (Batched) ───
//
// Embeds an array of texts. We process them sequentially
// to avoid rate limits (Gemini allows ~1500 RPM).
//
// Returns: [{ text, embedding }, ...]
//
async function embedBatch(texts, onProgress) {
  const results = [];

  for (let i = 0; i < texts.length; i++) {
    try {
      const embedding = await embedText(texts[i]);
      results.push({ index: i, embedding });

      // Report progress (useful for UI progress bar)
      if (onProgress) {
        onProgress(i + 1, texts.length);
      }
    } catch (err) {
      console.error(`⚠️  Failed to embed text ${i}: ${err.message}`);
      // Push a zero vector so indices stay aligned
      results.push({ index: i, embedding: null });
    }

    // Small delay to respect rate limits (60 RPM safe)
    if (i < texts.length - 1) {
      await sleep(100);
    }
  }

  console.log(`✅ Embedded ${results.filter(r => r.embedding).length}/${texts.length} texts`);
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { initEmbedder, embedText, embedBatch };
