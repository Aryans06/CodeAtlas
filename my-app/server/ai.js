// ═══════════════════════════════════════════════════════════
//  CodeAtlas — AI Response Generator (Gemini)
//
//  PURPOSE: Takes a user question + retrieved code chunks
//  and generates a grounded, context-aware answer.
//
//  THIS IS THE "RAG" (Retrieval-Augmented Generation) PATTERN:
//
//  1. User asks: "Where is authentication handled?"
//  2. Vector store returns relevant code chunks
//  3. We build a prompt: "Here's the code context: [chunks]. 
//     Now answer this question: [question]"
//  4. Gemini generates an answer GROUNDED in the actual code
//
//  Why RAG > plain ChatGPT?
//  - ChatGPT doesn't know YOUR code
//  - RAG feeds it the exact relevant snippets
//  - Answers include real file names and line numbers
// ═══════════════════════════════════════════════════════════

import { GoogleGenerativeAI } from '@google/generative-ai';

let model = null;

function initAI(apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  console.log('🤖 Gemini AI initialized (gemini-2.0-flash)');
}

// ─── Generate a Response ───
//
// question:       User's natural language question
// relevantChunks: Array of { chunk: { content, metadata }, score }
//                 (returned from vectorStore.search())
//
async function generateResponse(question, relevantChunks) {
  if (!model) throw new Error('AI not initialized. Call initAI(apiKey) first.');

  // Build the context from retrieved chunks
  const context = relevantChunks.map((result, i) => {
    const m = result.chunk.metadata;
    return `--- File: ${m.file} (lines ${m.startLine}-${m.endLine}) [relevance: ${(result.score * 100).toFixed(1)}%] ---
${result.chunk.content}`;
  }).join('\n\n');

  // ─── The RAG Prompt ───
  //
  // This is the key to good RAG: tell the model to ONLY use 
  // the provided context, and to cite file names + line numbers.
  //
  const systemPrompt = `You are CodeAtlas AI, an expert code analysis assistant.
You help developers understand codebases by answering questions about their code.

RULES:
1. ONLY answer based on the provided code context below
2. Always reference specific file names and line numbers
3. If the context doesn't contain enough info, say so honestly
4. Use clear, concise language — no fluff
5. Format code references like: \`filename.js:L12-L45\`
6. If you show code snippets, use markdown code blocks with the language

CODE CONTEXT:
${context}`;

  try {
    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.3, // Low temperature = more factual, less creative
      },
    });

    const result = await chat.sendMessage(
      `${systemPrompt}\n\nUSER QUESTION: ${question}`
    );

    const response = result.response.text();

    return {
      text: response,
      sources: relevantChunks.map(r => ({
        file: r.chunk.metadata.file,
        startLine: r.chunk.metadata.startLine,
        endLine: r.chunk.metadata.endLine,
        score: r.score,
        preview: r.chunk.content.slice(0, 200),
      })),
    };
  } catch (err) {
    console.error('❌ AI generation failed:', err.message);
    throw new Error(`AI generation failed: ${err.message}`);
  }
}

export { initAI, generateResponse };
