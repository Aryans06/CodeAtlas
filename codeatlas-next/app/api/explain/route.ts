import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { ollamaChat } from '@/lib/ollama';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase coordinates missing');
  return createClient(url, key);
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { filename, privacyMode, repoName } = await req.json();
    if (!filename) return NextResponse.json({ error: 'Filename is required' }, { status: 400 });

    const groqKey = process.env.GROQ_API_KEY;
    if (!privacyMode && !groqKey) return NextResponse.json({ error: 'Missing GROQ_API_KEY' }, { status: 500 });

    const supabase = getSupabase();


    const { data: chunks, error } = await supabase
      .from('code_chunks')
      .select('content, start_line, end_line')
      .eq('user_id', userId)
      .eq('repo_name', repoName || 'default')
      .eq('file', filename)
      .order('start_line');

    if (error) throw new Error(`DB Error: ${error.message}`);
    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ error: `File "${filename}" not found in indexed codebase.` }, { status: 404 });
    }


    const fullContent = chunks.map(c => c.content).join('\n');
    const truncated = fullContent.slice(0, 4000);

    const messages = [
      {
        role: 'system' as const,
        content: `You are CodeAtlas, a code documentation expert. Given a source file, generate a clear, structured explanation. Include:
1. **Purpose**: What this file does in one sentence.
2. **Key Exports**: List the main functions, classes, or components exported.
3. **Dependencies**: What external libraries or internal files it imports.
4. **How It Works**: A brief walkthrough of the logic flow.
5. **Notable Patterns**: Any design patterns, error handling, or edge cases worth mentioning.

Keep the explanation concise but informative. Use markdown formatting.`
      },
      {
        role: 'user' as const,
        content: `Explain this file: **${filename}**\n\n\`\`\`\n${truncated}\n\`\`\``
      }
    ];

    let explanation: string;

    if (privacyMode) {
      console.log('🔒 Privacy Mode: Explain via Ollama');
      explanation = await ollamaChat(messages, 'llama3:8b', { temperature: 0.2, max_tokens: 1200 });
    } else {
      const groq = new Groq({ apiKey: groqKey! });
      const completion = await groq.chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 1200,
      });
      explanation = completion.choices[0]?.message?.content || 'No explanation generated.';
    }

    return NextResponse.json({ explanation, filename });
  } catch (err: any) {
    console.error('❌ Explain failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
