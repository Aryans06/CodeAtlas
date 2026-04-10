import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { ollamaChatStream } from '@/lib/ollama';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase coordinates missing');
  return createClient(url, key);
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { privacyMode, repoName } = await req.json();
    const supabase = getSupabase();

    // 1. Fetch file context
    const { data: chunks, error } = await supabase
      .from('code_chunks')
      .select('file, content')
      .eq('user_id', userId)
      .eq('repo_name', repoName || 'default');

    if (error) throw new Error(error.message);
    if (!chunks || chunks.length === 0) {
      return new Response(JSON.stringify({ error: 'No codebase indexed.' }), { status: 404 });
    }

    // 2. Build high-level summary of the codebase for the AI
    const files = Array.from(new Set(chunks.map(c => c.file))).sort();
    
    // Grab the first few lines of important files (like package.json, main/index files)
    let extraContext = '';
    const pkgJson = chunks.find(c => c.file.endsWith('package.json'));
    if (pkgJson) {
      extraContext += `\n=== package.json ===\n${pkgJson.content.slice(0, 1000)}\n`;
    }

    // Grab READMEs or config files if any
    const configs = chunks.filter(c => c.file.includes('config') || c.file.endsWith('.md'));
    for (const c of configs.slice(0, 3)) {
      extraContext += `\n=== ${c.file} ===\n${c.content.slice(0, 500)}\n`;
    }

    const prompt = `You are an expert technical writer and developer. Write a comprehensive, professional README.md for the following project.
The project contains ${files.length} files.

### File Structure:
${files.slice(0, 100).join('\n')}${files.length > 100 ? '\n...and more.' : ''}

### Project Context (Config/Deps):
${extraContext}

Write a README in markdown with these sections:
- Project Title (infer from package.json or file paths)
- Description (What the project does based on the file names and dependencies)
- Tech Stack
- Folder Structure Overview
- Getting Started (If package.json is present, assume npm install / npm run dev)

Format the output strictly as Markdown. Do not wrap the response in a markdown code block, just output the raw markdown text.`;

    const messages = [{ role: 'user', content: prompt }];

    if (privacyMode) {
      // Stream directly from Ollama
      const stream = await ollamaChatStream(messages);
      return new Response(stream as any, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Dynamically import Groq for cloud mode
      const { Groq } = await import('groq-sdk');
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const stream = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        stream: true,
      });

      const readableStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || '';
            if (token) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  } catch (err: any) {
    console.error('README Generation Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
