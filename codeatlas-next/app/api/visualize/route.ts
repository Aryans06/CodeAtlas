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

// Fetch chunks helper
async function fetchChunks(userId: string) {
  const supabase = getSupabase();
  const { data: chunks, error } = await supabase
    .from('code_chunks')
    .select('file, content, start_line')
    .eq('user_id', userId)
    .order('file')
    .order('start_line');

  if (error) throw new Error(`DB Error: ${error.message}`);
  if (!chunks || chunks.length === 0) throw new Error('No codebase indexed. Upload files first.');
  return chunks;
}

// Build file map with imports
function buildFileMap(chunks: any[]) {
  const fileMap = new Map<string, string[]>();
  for (const chunk of chunks) {
    if (!fileMap.has(chunk.file)) fileMap.set(chunk.file, []);
    if (chunk.start_line <= 30) fileMap.get(chunk.file)!.push(chunk.content);
  }
  return fileMap;
}

// Generate DEPENDENCY GRAPH
async function generateDependencyGraph(chunks: any[], groqKey: string) {
  const fileMap = buildFileMap(chunks);
  const fileSummaries: string[] = [];
  for (const [file, contents] of fileMap) {
    const importSection = contents.join('\n').slice(0, 800);
    fileSummaries.push(`=== ${file} ===\n${importSection}`);
  }
  const fileList = Array.from(fileMap.keys());
  const summaryText = fileSummaries.slice(0, 40).join('\n\n');

  const groq = new Groq({ apiKey: groqKey });
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a software architecture expert. Given a list of source files and their import statements, generate a Mermaid.js flowchart diagram showing the dependency/architecture graph.

CRITICAL MERMAID SYNTAX RULES:
1. Output ONLY valid Mermaid syntax. Start with "graph TD". No markdown fences.
2. ABSOLUTELY NO CURLY BRACES "{ }" for subgraphs. You MUST use the "end" keyword.
3. Example of GOOD syntax:
   subgraph Lib
     node_id["lib.ts"]
   end
4. Show arrows from importing file → imported file (e.g., A -->|uses| B).
5. Quote filenames with extensions in node definitions like: A["file.ts"]
6. Keep it clean — focus only on the most important architectural connections.`
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
  mermaidCode = mermaidCode.replace(/^```mermaid\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  // Fix common AI syntax errors:
  // 1. -->|label|> should be -->|label|  (remove trailing >)
  mermaidCode = mermaidCode.replace(/\|>\s/g, '| ');
  mermaidCode = mermaidCode.replace(/\|>$/gm, '|');
  // 2. Remove curly braces in subgraphs
  mermaidCode = mermaidCode.replace(/\{/g, '').replace(/\}/g, '');
  // 3. Ensure graph declaration
  if (!mermaidCode.startsWith('graph') && !mermaidCode.startsWith('flowchart')) {
    mermaidCode = 'graph TD\n' + mermaidCode;
  }

  return { mermaid: mermaidCode, fileCount: fileList.length };
}

// Generate FILE DISTRIBUTION PIE CHART (no AI needed!)
function generateFileDistribution(chunks: any[]) {
  const extCount: Record<string, number> = {};
  const uniqueFiles = new Set<string>();

  for (const chunk of chunks) {
    if (uniqueFiles.has(chunk.file)) continue;
    uniqueFiles.add(chunk.file);
    const ext = chunk.file.split('.').pop()?.toLowerCase() || 'other';
    extCount[ext] = (extCount[ext] || 0) + 1;
  }

  // Build pie chart Mermaid syntax
  let mermaid = 'pie title File Distribution by Language\n';
  // Sort by count desc
  const sorted = Object.entries(extCount).sort((a, b) => b[1] - a[1]);
  for (const [ext, count] of sorted) {
    const label = extToLabel(ext);
    mermaid += `    "${label}" : ${count}\n`;
  }

  return { mermaid, fileCount: uniqueFiles.size };
}

function extToLabel(ext: string): string {
  const labels: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TSX/React', js: 'JavaScript', jsx: 'JSX/React',
    py: 'Python', css: 'CSS', html: 'HTML', json: 'JSON', md: 'Markdown',
    go: 'Go', rs: 'Rust', java: 'Java', rb: 'Ruby', yml: 'YAML', yaml: 'YAML',
    sql: 'SQL', sh: 'Shell', toml: 'TOML', lock: 'Lock File',
  };
  return labels[ext] || ext.toUpperCase();
}

// Generate DATA FLOW SEQUENCE DIAGRAM
async function generateDataFlow(chunks: any[], groqKey: string) {
  const fileMap = buildFileMap(chunks);
  const fileSummaries: string[] = [];
  for (const [file, contents] of fileMap) {
    const importSection = contents.join('\n').slice(0, 600);
    fileSummaries.push(`=== ${file} ===\n${importSection}`);
  }
  const fileList = Array.from(fileMap.keys());
  const summaryText = fileSummaries.slice(0, 30).join('\n\n');

  const groq = new Groq({ apiKey: groqKey });
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a software architecture expert. Given a list of source files and their imports, generate a Mermaid.js SEQUENCE DIAGRAM showing a typical request data flow through the application.

CRITICAL MERMAID SYNTAX RULES:
1. Output ONLY valid Mermaid syntax. Start with "sequenceDiagram". No markdown fences.
2. Use participant declarations at the top like: participant Browser
3. Use standard arrow syntax: Browser->>API: POST /chat
4. DO NOT use activate or deactivate keywords. They cause rendering errors.
5. Use Note right of / Note over for annotations instead.
6. Include the most important actors like: Browser, API, VectorDB, AI
7. Show a realistic request lifecycle for the main feature of the app.
8. Keep it to 10-15 interactions max. Keep labels short.`
      },
      {
        role: 'user',
        content: `Here are ${fileList.length} source files:\n\n${summaryText}\n\nFull file list:\n${fileList.join('\n')}\n\nGenerate a Mermaid.js sequence diagram showing the main data flow now.`
      }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 1500,
  });

  let mermaidCode = completion.choices[0]?.message?.content || '';
  mermaidCode = mermaidCode.replace(/^```mermaid\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  // Strip activate/deactivate lines — they cause mismatched pair errors
  mermaidCode = mermaidCode.replace(/^\s*(activate|deactivate)\s+.*$/gm, '').trim();
  if (!mermaidCode.startsWith('sequenceDiagram')) {
    mermaidCode = 'sequenceDiagram\n' + mermaidCode;
  }

  return { mermaid: mermaidCode, fileCount: fileList.length };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ error: 'Missing GROQ_API_KEY' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const type = body.type || 'dependency';

    const chunks = await fetchChunks(userId);

    let result;
    switch (type) {
      case 'pie':
        result = generateFileDistribution(chunks);
        break;
      case 'sequence':
        result = await generateDataFlow(chunks, groqKey);
        break;
      case 'dependency':
      default:
        result = await generateDependencyGraph(chunks, groqKey);
        break;
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('❌ Visualize failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
