import { GoogleGenerativeAI } from '@google/generative-ai';

let model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

export function initAI(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      maxOutputTokens: 1500,
      temperature: 0.3,
    },
  });
  console.log('🤖 Gemini AI initialized (gemini-2.0-flash)');
}

interface SearchResult {
  chunk: { content: string; metadata: { file: string; startLine: number; endLine: number } };
  score: number;
}

interface AIResponse {
  text: string;
  sources: {
    file: string;
    startLine: number;
    endLine: number;
    score: number;
    preview: string;
  }[];
}

export async function generateResponse(
  question: string,
  relevantChunks: SearchResult[]
): Promise<AIResponse> {
  if (!model) throw new Error('AI not initialized');

  const context = relevantChunks
    .map(r => {
      const m = r.chunk.metadata;
      return `--- File: ${m.file} (lines ${m.startLine}-${m.endLine}) [${(r.score * 100).toFixed(1)}% relevant] ---\n${r.chunk.content}`;
    })
    .join('\n\n');

  const prompt = `You are CodeAtlas AI, an expert code analysis assistant.
Answer ONLY based on the code context provided below. Reference specific file names and line numbers.
Format code references as: \`filename.js:L12-L45\`

CODE CONTEXT:
${context}

USER QUESTION: ${question}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

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
