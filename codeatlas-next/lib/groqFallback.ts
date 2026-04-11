import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';

const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';
const GEMINI_MODEL = 'gemini-2.5-flash';

function isRateLimitError(err: any): boolean {
  if (err?.status === 429) return true;
  const msg = (err?.message || err?.error?.message || '').toLowerCase();
  return msg.includes('rate limit') || msg.includes('rate_limit') || msg.includes('too many requests');
}

function getGroqClient(apiKey?: string): Groq {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) throw new Error('Missing GROQ_API_KEY');
  return new Groq({ apiKey: key });
}

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null; // Make it optional so it doesn't crash if they haven't set it yet
  return new GoogleGenAI({ apiKey: key });
}

/**
 * Converts OpenAI/Groq style [{ role: 'user', content: 'hello' }] to Gemini style contents.
 */
function toGeminiMessages(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) {
  // Extract system prompt
  const systemMessage = messages.find(m => m.role === 'system')?.content;
  
  // Convert chat history
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  return { systemInstruction: systemMessage, contents };
}

/**
 * Non-streaming Groq chat with automatic fallback to 8B, and ultimately to Gemini.
 */
export async function groqChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: { temperature?: number; max_tokens?: number; apiKey?: string } = {}
): Promise<{ content: string; model: string }> {
  const groq = getGroqClient(options.apiKey);
  const params = {
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.max_tokens ?? 1500,
  };

  try {
    // 1. Try Primary
    const completion = await groq.chat.completions.create({
      ...params,
      model: PRIMARY_MODEL,
    });
    return {
      content: completion.choices[0]?.message?.content || '',
      model: PRIMARY_MODEL,
    };
  } catch (err: any) {
    if (!isRateLimitError(err)) throw err;
    
    // 2. Try Secondary (8B)
    console.warn(`⚠️ Rate limit hit on ${PRIMARY_MODEL}, falling back to ${FALLBACK_MODEL}`);
    try {
      const completion = await groq.chat.completions.create({
        ...params,
        model: FALLBACK_MODEL,
      });
      return {
        content: completion.choices[0]?.message?.content || '',
        model: FALLBACK_MODEL,
      };
    } catch (fallbackErr: any) {
      if (!isRateLimitError(fallbackErr)) throw fallbackErr;
      
      // 3. Ultimate Fallback (Gemini)
      const gemini = getGeminiClient();
      if (!gemini) {
        console.error('❌ Groq rate limits exhausted and no GEMINI_API_KEY found.');
        throw fallbackErr; // No Gemini key, throw the original groq error
      }
      
      console.warn(`🔥 Groq organization limits reached. Falling back to Google ${GEMINI_MODEL}`);
      const { systemInstruction, contents } = toGeminiMessages(messages);
      
      const response = await gemini.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction,
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.max_tokens ?? 1500,
        }
      });
      
      return {
        content: response.text || '',
        model: GEMINI_MODEL
      };
    }
  }
}

/**
 * Streaming Groq chat with automatic fallback to 8B, and ultimately to Gemini.
 */
export async function groqChatStream(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: { temperature?: number; max_tokens?: number; apiKey?: string } = {}
): Promise<{ stream: any; model: string }> {
  const groq = getGroqClient(options.apiKey);
  const params = {
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.max_tokens ?? 1500,
    stream: true as const,
  };

  try {
    // 1. Try Primary
    const stream = await groq.chat.completions.create({
      ...params,
      model: PRIMARY_MODEL,
    });
    return { stream, model: PRIMARY_MODEL };
  } catch (err: any) {
    if (!isRateLimitError(err)) throw err;
    
    // 2. Try Secondary (8B)
    console.warn(`⚠️ Rate limit hit on ${PRIMARY_MODEL}, falling back to ${FALLBACK_MODEL} (stream)`);
    try {
      const stream = await groq.chat.completions.create({
        ...params,
        model: FALLBACK_MODEL,
      });
      return { stream, model: FALLBACK_MODEL };
    } catch (fallbackErr: any) {
      if (!isRateLimitError(fallbackErr)) throw fallbackErr;
      
      // 3. Ultimate Fallback (Gemini Stream)
      const gemini = getGeminiClient();
      if (!gemini) {
        console.error('❌ Groq rate limits exhausted and no GEMINI_API_KEY found.');
        throw fallbackErr;
      }
      
      console.warn(`🔥 Groq organization limits reached. Falling back to Google ${GEMINI_MODEL} (stream)`);
      const { systemInstruction, contents } = toGeminiMessages(messages);
      
      const geminiStream = await gemini.models.generateContentStream({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction,
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.max_tokens ?? 1500,
        }
      });
      
      // Transform Gemini stream to look exactly like OpenAI/Groq stream
      const streamWrapper = {
        async *[Symbol.asyncIterator]() {
          for await (const chunk of geminiStream) {
            if (chunk.text) {
              yield {
                choices: [{
                  delta: { content: chunk.text }
                }]
              };
            }
          }
        }
      };
      
      return { stream: streamWrapper, model: GEMINI_MODEL };
    }
  }
}
