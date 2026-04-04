import Groq from 'groq-sdk';

let groq: Groq | null = null;

export function initAI(apiKey: string) {
  groq = new Groq({ apiKey });
  console.log('🤖 Groq AI initialized (llama3-70b-8192)');
}

export function isAIReady(): boolean {
  return groq !== null;
}

interface SearchResult {
  chunk: { content: string; metadata: { file: string; startLine: number; endLine: number } };
  score: number;
}

interface AIResponse {
  text: string;
  sources: { file: string; startLine: number; endLine: number; score: number; preview: string }[];
}

export async function generateResponse(
  question: string,
  relevantChunks: SearchResult[]
): Promise<AIResponse> {
  if (!groq) throw new Error('AI not initialized');

  const context = relevantChunks
    .map(r => {
      const m = r.chunk.metadata;
      return `--- File: ${m.file} (lines ${m.startLine}-${m.endLine}) ---\n${r.chunk.content}`;
    })
    .join('\n\n');

  // Llama 3.3 70B runs at blazing fast speeds on Groq
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are CodeAtlas, a blazing fast AI codebase search tool.
Read the CODE CONTEXT below and answer the user's question completely.
If you know the exact file name and line numbers from the context, YOU MUST reference them like this: \`filename.js:L2-L4\`.
If the answer is missing from context, do not try to guess.`
      },
      {
        role: "user",
        content: `CODE CONTEXT:\n${context}\n\nUSER QUESTION: ${question}`
      }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    max_tokens: 1500,
  });

  const text = chatCompletion.choices[0]?.message?.content || 'No response generated.';

  return {
    text,
    sources: relevantChunks.map(r => ({
      file: r.chunk.metadata.file,
      startLine: r.chunk.metadata.startLine,
      endLine: r.chunk.metadata.endLine,
      score: r.score,
      preview: r.chunk.content.slice(0, 200),
    })),
  };
}
