/**
 * Ollama client for Privacy Mode.
 * Talks to a locally running Ollama instance at http://localhost:11434.
 * Mirrors the Groq SDK patterns so our code stays clean.
 */

const OLLAMA_BASE = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3:8b';

// ─── Status Check ───────────────────────────────────────────────
export async function checkOllamaStatus(): Promise<{
  available: boolean;
  models: string[];
  error?: string;
}> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
    const data = await res.json();
    const models = (data.models || []).map((m: any) => m.name as string);
    return { available: true, models };
  } catch (err: any) {
    return {
      available: false,
      models: [],
      error: err.message?.includes('fetch failed') || err.message?.includes('ECONNREFUSED')
        ? 'Ollama is not running. Start it with: ollama serve'
        : err.message,
    };
  }
}

// ─── Chat Completion (Non-Streaming) ────────────────────────────
export async function ollamaChat(
  messages: { role: string; content: string }[],
  model: string = DEFAULT_MODEL,
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.2,
        num_predict: options?.max_tokens ?? 1500,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.message?.content || '';
}

// ─── Streaming Chat Completion ──────────────────────────────────
// Returns an async iterable that yields objects matching the Groq
// stream shape: { choices: [{ delta: { content: string } }] }
export async function ollamaChatStream(
  messages: { role: string; content: string }[],
  model: string = DEFAULT_MODEL,
  options?: { temperature?: number; max_tokens?: number }
) {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: {
        temperature: options?.temperature ?? 0.2,
        num_predict: options?.max_tokens ?? 1500,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error (${res.status}): ${errText}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  // Return an async iterable that mirrors the Groq stream format
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          while (true) {
            const { done, value } = await reader.read();
            if (done) return { done: true, value: undefined };

            const text = decoder.decode(value, { stream: true });
            // Ollama streams one JSON object per line
            const lines = text.split('\n').filter(l => l.trim());

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.done) return { done: true, value: undefined };
                // Transform to Groq-compatible shape
                return {
                  done: false,
                  value: {
                    choices: [{
                      delta: { content: parsed.message?.content || '' }
                    }]
                  }
                };
              } catch {
                // Skip malformed lines
              }
            }
          }
        }
      };
    }
  };
}
