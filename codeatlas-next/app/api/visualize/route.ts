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

function sanitizeMermaid(code: string, type: 'flowchart' | 'sequence' | 'pie'): string {
  let cleaned = code
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (type === 'sequence') {
    // Fix invalid dotted async arrows: -.->> → -.->  and  -..->> → -..->  
    cleaned = cleaned.replace(/-\.->>/g, '-.->');
    cleaned = cleaned.replace(/-\.\.->/g, '-.->');
    cleaned = cleaned.replace(/-->>>/g, '-->>');
    // Strip activate/deactivate — causes mismatched pair errors
    cleaned = cleaned.replace(/^\s*(activate|deactivate)\s+.*$/gm, '');
    // Fix labels with special chars that break parsing
    cleaned = cleaned.replace(/:\s*([^\n]*[<>{}][^\n]*)/g, (_, label) => {
      return ': ' + label.replace(/[<>{}]/g, '');
    });
    if (!cleaned.startsWith('sequenceDiagram')) {
      cleaned = 'sequenceDiagram\n' + cleaned;
    }
  }

  if (type === 'flowchart') {
    // Fix -->|label|> → -->|label|  (trailing > after pipe)
    cleaned = cleaned.replace(/\|>\s/g, '| ');
    cleaned = cleaned.replace(/\|>$/gm, '|');
    // Remove curly braces in subgraphs (AI loves adding them)
    cleaned = cleaned.replace(/\{/g, '').replace(/\}/g, '');
    // Fix dotted arrows that are invalid in flowcharts
    cleaned = cleaned.replace(/-\.->>/g, '-.->');
    cleaned = cleaned.replace(/-\.\.->/g, '-.->');
    // Fix double-arrow syntax
    cleaned = cleaned.replace(/={3,}>/g, '==>');
    cleaned = cleaned.replace(/--{3,}>/g, '-->');
    if (!cleaned.startsWith('graph') && !cleaned.startsWith('flowchart')) {
      cleaned = 'graph TD\n' + cleaned;
    }
  }

  // Universal: strip blank lines that can cause parse issues
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

async function fetchChunks(userId: string, repoName: string) {
  const supabase = getSupabase();
  let query = supabase
    .from('code_chunks')
    .select('file, content, start_line')
    .eq('user_id', userId);

  if (repoName) {
    query = query.eq('repo_name', repoName);
  }

  const { data: chunks, error } = await query.order('file').order('start_line');

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
async function generateDependencyGraph(chunks: any[], groqKey: string, privacyMode = false) {
  const fileMap = buildFileMap(chunks);
  const fileSummaries: string[] = [];
  for (const [file, contents] of fileMap) {
    const importSection = contents.join('\n').slice(0, 800);
    fileSummaries.push(`=== ${file} ===\n${importSection}`);
  }
  const fileList = Array.from(fileMap.keys());
  const summaryText = fileSummaries.slice(0, 40).join('\n\n');

  const messages = [
    {
      role: 'system' as const,
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
      role: 'user' as const,
      content: `Here are ${fileList.length} source files and their import sections:\n\n${summaryText}\n\nFull file list:\n${fileList.join('\n')}\n\nGenerate the Mermaid.js architecture diagram now.`
    }
  ];

  let mermaidCode: string;
  if (privacyMode) {
    console.log('🔒 Privacy Mode: Visualize (dependency) via Ollama');
    mermaidCode = await ollamaChat(messages, 'llama3:8b', { temperature: 0.1, max_tokens: 2000 });
  } else {
    const groq = new Groq({ apiKey: groqKey });
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 2000,
    });
    mermaidCode = completion.choices[0]?.message?.content || '';
  }
  mermaidCode = sanitizeMermaid(mermaidCode, 'flowchart');

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
async function generateDataFlow(chunks: any[], groqKey: string, privacyMode = false) {
  const fileMap = buildFileMap(chunks);
  const fileSummaries: string[] = [];
  for (const [file, contents] of fileMap) {
    const importSection = contents.join('\n').slice(0, 600);
    fileSummaries.push(`=== ${file} ===\n${importSection}`);
  }
  const fileList = Array.from(fileMap.keys());
  const summaryText = fileSummaries.slice(0, 30).join('\n\n');

  const messages = [
    {
      role: 'system' as const,
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
      role: 'user' as const,
      content: `Here are ${fileList.length} source files:\n\n${summaryText}\n\nFull file list:\n${fileList.join('\n')}\n\nGenerate a Mermaid.js sequence diagram showing the main data flow now.`
    }
  ];

  let mermaidCode: string;
  if (privacyMode) {
    console.log('🔒 Privacy Mode: Visualize (dataflow) via Ollama');
    mermaidCode = await ollamaChat(messages, 'llama3:8b', { temperature: 0.2, max_tokens: 1500 });
  } else {
    const groq = new Groq({ apiKey: groqKey });
    const completion = await groq.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1500,
    });
    mermaidCode = completion.choices[0]?.message?.content || '';
  }
  mermaidCode = sanitizeMermaid(mermaidCode, 'sequence');

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
    const privacyMode = body.privacyMode || false;
    const repoName = body.repoName || 'default';

    const chunks = await fetchChunks(userId, repoName);

    let result;
    switch (type) {
      case 'pie':
        result = generateFileDistribution(chunks);
        break;
      case 'sequence':
        result = await generateDataFlow(chunks, groqKey, privacyMode);
        break;
      case 'dependency':
      default:
        result = await generateDependencyGraph(chunks, groqKey, privacyMode);
        break;
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('❌ Visualize failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
