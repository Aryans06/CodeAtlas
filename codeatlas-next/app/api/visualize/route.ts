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

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ error: 'Missing GROQ_API_KEY' }, { status: 500 });

    const supabase = getSupabase();

    // Fetch all chunks for this user
    const { data: chunks, error } = await supabase
      .from('code_chunks')
      .select('file, content, start_line')
      .eq('user_id', userId)
      .order('file')
      .order('start_line');

    if (error) throw new Error(`DB Error: ${error.message}`);
    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ error: 'No codebase indexed. Upload files first.' }, { status: 400 });
    }

    // Group chunks by file and extract first ~30 lines (where imports live)
    const fileMap = new Map<string, string[]>();
    for (const chunk of chunks) {
      if (!fileMap.has(chunk.file)) {
        fileMap.set(chunk.file, []);
      }
      // Only keep chunks near the top of the file (imports)
      if (chunk.start_line <= 30) {
        fileMap.get(chunk.file)!.push(chunk.content);
      }
    }

    // Build a compact summary: each file + its first 30 lines
    const fileSummaries: string[] = [];
    for (const [file, contents] of fileMap) {
      const importSection = contents.join('\n').slice(0, 800); // Cap at 800 chars per file
      fileSummaries.push(`=== ${file} ===\n${importSection}`);
    }

    const fileList = Array.from(fileMap.keys());
    const summaryText = fileSummaries.slice(0, 40).join('\n\n'); // Cap at 40 files

    // Ask Groq to generate a Mermaid diagram
    const groq = new Groq({ apiKey: groqKey });
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a software architecture expert. Given a list of source files and their import statements, generate a Mermaid.js flowchart diagram showing the dependency/architecture graph.

CRITICAL MERMAID SYNTAX RULES:
1. Output ONLY valid Mermaid syntax. Start with "graph TD". No markdown fences.
2. ABSOLUTELY NO CURLY BRACES "{ }" for subgraphs. You MUST use the "end" keyword.
3. Example of BAD syntax (NEVER DO THIS):
   subgraph "lib" {
     nodeA
   }
4. Example of GOOD syntax (DO THIS):
   subgraph Lib
     node_id["lib.ts"]
   end
5. Show arrows from importing file → imported file (e.g., A -->|uses| B).
6. Quote filenames with extensions in node definitions like: A["file.ts"]
7. Keep it clean — focus only on the most important architectural connections.`
        },
        {
          role: 'user',
          content: `Here are ${fileList.length} source files and their import sections:\n\n${summaryText}\n\nFull file list:\n${fileList.join('\n')}\n\nGenerate the Mermaid.js architecture diagram now.`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 2000,
    });

    let mermaidCode = completion.choices[0]?.message?.content || '';
    
    // Clean up: remove markdown fences if the AI included them
    mermaidCode = mermaidCode
      .replace(/^```mermaid\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // Ensure it starts with graph
    if (!mermaidCode.startsWith('graph') && !mermaidCode.startsWith('flowchart')) {
      mermaidCode = 'graph TD\n' + mermaidCode;
    }

    return NextResponse.json({
      mermaid: mermaidCode,
      fileCount: fileList.length,
    });
  } catch (err: any) {
    console.error('❌ Visualize failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
