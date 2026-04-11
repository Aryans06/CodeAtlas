import Groq from 'groq-sdk';

const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

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

/**
 * Non-streaming Groq chat with automatic fallback from 70B to 8B on rate limit.
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
    const completion = await groq.chat.completions.create({
      ...params,
      model: PRIMARY_MODEL,
    });
    return {
      content: completion.choices[0]?.message?.content || '',
      model: PRIMARY_MODEL,
    };
  } catch (err: any) {
    if (isRateLimitError(err)) {
      console.warn(`⚠️ Rate limit hit on ${PRIMARY_MODEL}, falling back to ${FALLBACK_MODEL}`);
      const completion = await groq.chat.completions.create({
        ...params,
        model: FALLBACK_MODEL,
      });
      return {
        content: completion.choices[0]?.message?.content || '',
        model: FALLBACK_MODEL,
      };
    }
    throw err;
  }
}

/**
 * Streaming Groq chat with automatic fallback from 70B to 8B on rate limit.
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
    const stream = await groq.chat.completions.create({
      ...params,
      model: PRIMARY_MODEL,
    });
    return { stream, model: PRIMARY_MODEL };
  } catch (err: any) {
    if (isRateLimitError(err)) {
      console.warn(`⚠️ Rate limit hit on ${PRIMARY_MODEL}, falling back to ${FALLBACK_MODEL} (stream)`);
      const stream = await groq.chat.completions.create({
        ...params,
        model: FALLBACK_MODEL,
      });
      return { stream, model: FALLBACK_MODEL };
    }
    throw err;
  }
}
