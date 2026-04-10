import Groq from 'groq-sdk';
import { ollamaChat, ollamaChatStream } from './ollama';

let groq: Groq | null = null;

const OLLAMA_MODEL = 'llama3:8b';

export function initAI(apiKey: string) {
  groq = new Groq({ apiKey });
  console.log('🤖 Groq AI initialized (llama-3.3-70b-versatile)');
}

export function isAIReady(): boolean {
  return groq !== null;
}

interface SearchResult {
  chunk: { content: string; metadata: { file: string; startLine: number; endLine: number } };
  score: number;
}

function buildMessages(question: string, relevantChunks: SearchResult[]) {
  const context = relevantChunks
    .map(r => {
      const m = r.chunk.metadata;
      return `--- File: ${m.file} (lines ${m.startLine}-${m.endLine}) ---\n${r.chunk.content}`;
    })
    .join('\n\n');

  return {
    messages: [
      {
        role: 'system' as const,
        content: `You are CodeAtlas, a blazing fast AI codebase search tool.
Read the CODE CONTEXT below and answer the user's question completely.
If you know the exact file name and line numbers from the context, YOU MUST reference them like this: \`filename.js:L2-L4\`.
If the answer is missing from context, do not try to guess.`
      },
      {
        role: 'user' as const,
        content: `CODE CONTEXT:\n${context}\n\nUSER QUESTION: ${question}`
      }
    ],
    sources: relevantChunks.map(r => ({
      file: r.chunk.metadata.file,
      startLine: r.chunk.metadata.startLine,
      endLine: r.chunk.metadata.endLine,
      score: r.score,
      preview: r.chunk.content.slice(0, 200),
    })),
  };
}

export async function generateResponse(
  question: string,
  relevantChunks: SearchResult[],
  privacyMode = false
) {
  const { messages, sources } = buildMessages(question, relevantChunks);

  let text: string;

  if (privacyMode) {
    console.log('🔒 Privacy Mode: using Ollama for generation');
    text = await ollamaChat(messages, OLLAMA_MODEL, { temperature: 0.2, max_tokens: 1500 });
  } else {
    if (!groq) throw new Error('AI not initialized');
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1500,
    });
    text = chatCompletion.choices[0]?.message?.content || 'No response generated.';
  }

  return { text, sources };
}

/**
 * Streaming variant — returns a stream + sources.
 * In privacy mode, uses Ollama's streaming; otherwise uses Groq.
 * Both return an async iterable with { choices: [{ delta: { content } }] }.
 */
export async function generateStreamingResponse(
  question: string,
  relevantChunks: SearchResult[],
  privacyMode = false
) {
  const { messages, sources } = buildMessages(question, relevantChunks);

  if (privacyMode) {
    console.log('🔒 Privacy Mode: streaming from Ollama');
    const stream = await ollamaChatStream(messages, OLLAMA_MODEL, { temperature: 0.2, max_tokens: 1500 });
    return { stream, sources };
  }

  if (!groq) throw new Error('AI not initialized');

  const stream = await groq.chat.completions.create({
    messages,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 1500,
    stream: true,
  });

  return { stream, sources };
}
