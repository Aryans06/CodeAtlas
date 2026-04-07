import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

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

    const { filename } = await req.json();
    if (!filename) return NextResponse.json({ error: 'Filename is required' }, { status: 400 });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ error: 'Missing GROQ_API_KEY' }, { status: 500 });

    const supabase = getSupabase();

    // Fetch all chunks for this specific file
    const { data: chunks, error } = await supabase
      .from('code_chunks')
      .select('content, start_line, end_line')
      .eq('user_id', userId)
      .eq('file', filename)
      .order('start_line');

    if (error) throw new Error(`DB Error: ${error.message}`);
    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ error: `File "${filename}" not found in indexed codebase.` }, { status: 404 });
    }

    // Reassemble the file content from chunks
    const fullContent = chunks.map(c => c.content).join('\n');
    // Cap at ~4000 chars to stay within token limits
    const truncated = fullContent.slice(0, 4000);

    const groq = new Groq({ apiKey: groqKey });
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are CodeAtlas, a code documentation expert. Given a source file, generate a clear, structured explanation. Include:
1. **Purpose**: What this file does in one sentence.
2. **Key Exports**: List the main functions, classes, or components exported.
3. **Dependencies**: What external libraries or internal files it imports.
4. **How It Works**: A brief walkthrough of the logic flow.
5. **Notable Patterns**: Any design patterns, error handling, or edge cases worth mentioning.

Keep the explanation concise but informative. Use markdown formatting.`
        },
        {
          role: 'user',
          content: `Explain this file: **${filename}**\n\n\`\`\`\n${truncated}\n\`\`\``
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1200,
    });

    const explanation = completion.choices[0]?.message?.content || 'No explanation generated.';

    return NextResponse.json({ explanation, filename });
  } catch (err: any) {
    console.error('❌ Explain failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
