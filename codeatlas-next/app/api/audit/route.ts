import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { initEmbedder, embedText } from '@/lib/embedder';
import { vectorStore } from '@/lib/vectorStore';
import Groq from 'groq-sdk';
import { ollamaChat } from '@/lib/ollama';

// Security threat vectors to scan for
const THREAT_VECTORS = [
  { id: 'secrets', query: 'hardcoded API key password secret token credential private key environment variable', label: 'Hardcoded Secrets' },
  { id: 'injection', query: 'SQL query string concatenation raw query user input database execute unsanitized', label: 'Injection Vulnerabilities' },
  { id: 'xss', query: 'dangerouslySetInnerHTML innerHTML eval document.write user input rendered HTML template literal', label: 'Cross-Site Scripting (XSS)' },
  { id: 'auth', query: 'authentication bypass no auth check admin route unprotected endpoint middleware missing authorization', label: 'Authentication Issues' },
  { id: 'exposure', query: 'console.log sensitive data error stack trace detailed error message exposed debug mode verbose logging', label: 'Data Exposure' },
  { id: 'config', query: 'CORS allow all origin rejectUnauthorized false insecure SSL TLS disabled security header missing', label: 'Insecure Configuration' },
];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hfToken = process.env.HF_TOKEN;
    const groqKey = process.env.GROQ_API_KEY;

    const body = await req.json().catch(() => ({}));
    const privacyMode = body.privacyMode || false;

    if (!hfToken) {
      return NextResponse.json({ error: 'Missing HF_TOKEN' }, { status: 500 });
    }
    if (!privacyMode && !groqKey) {
      return NextResponse.json({ error: 'Missing GROQ_API_KEY' }, { status: 500 });
    }

    initEmbedder(hfToken);

    // Step 1: For each threat vector, do a semantic search
    console.log('🛡️ Security Audit: Scanning for vulnerabilities...');
    const allFindings: { category: string; chunks: any[] }[] = [];

    for (const threat of THREAT_VECTORS) {
      const queryEmbedding = await embedText(threat.query);
      const results = await vectorStore.search(userId, queryEmbedding, 3);
      // Only keep results with decent relevance
      const relevant = results.filter((r: any) => r.score > 0.25);
      if (relevant.length > 0) {
        allFindings.push({ category: threat.label, chunks: relevant });
      }
    }

    if (allFindings.length === 0) {
      return NextResponse.json({
        findings: [],
        summary: 'No potential security issues detected. Your codebase looks clean!',
        scannedCategories: THREAT_VECTORS.length,
      });
    }

    // Step 2: Send the suspicious chunks to AI for analysis
    const suspiciousCode = allFindings.map(f => {
      const snippets = f.chunks.map((c: any) =>
        `File: ${c.chunk.metadata.file} (L${c.chunk.metadata.startLine}-${c.chunk.metadata.endLine})\n${c.chunk.content.slice(0, 500)}`
      ).join('\n\n');
      return `--- ${f.category} ---\n${snippets}`;
    }).join('\n\n');

    const groqMessages = [
      {
        role: 'system' as const,
        content: `You are a senior security auditor. You will receive code snippets that were flagged by a semantic search as potentially insecure.

Your job is to review each snippet and determine if there is an ACTUAL security vulnerability. Many snippets will be false positives — only report real issues.

For each REAL vulnerability found, output a JSON array entry with:
- "severity": "critical" | "warning" | "info"
- "title": Short title of the issue
- "file": The file path
- "line": The approximate line range
- "description": A 1-2 sentence explanation of why this is dangerous
- "fix": A 1-2 sentence suggestion on how to fix it

Output ONLY a valid JSON array. No markdown fences. If no real issues are found, output an empty array: []`
      },
      {
        role: 'user' as const,
        content: `Review these flagged code snippets for security vulnerabilities:\n\n${suspiciousCode}`
      }
    ];

    let aiResponse: string;
    if (privacyMode) {
      console.log('🔒 Privacy Mode: Audit via Ollama');
      aiResponse = await ollamaChat(groqMessages, 'llama3:8b', { temperature: 0.1, max_tokens: 2000 });
    } else {
      const groq = new Groq({ apiKey: groqKey! });
      const completion = await groq.chat.completions.create({
        messages: groqMessages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 2000,
      });
      aiResponse = completion.choices[0]?.message?.content || '[]';
    }
    // Clean potential markdown fences
    aiResponse = aiResponse.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();

    let findings = [];
    try {
      findings = JSON.parse(aiResponse);
    } catch {
      console.error('Failed to parse AI response:', aiResponse);
      findings = [];
    }

    // Ensure it's an array
    if (!Array.isArray(findings)) findings = [];

    const critical = findings.filter((f: any) => f.severity === 'critical').length;
    const warnings = findings.filter((f: any) => f.severity === 'warning').length;
    const info = findings.filter((f: any) => f.severity === 'info').length;

    console.log(`🛡️ Audit complete: ${critical} critical, ${warnings} warnings, ${info} info`);

    return NextResponse.json({
      findings,
      summary: findings.length === 0
        ? 'No real vulnerabilities detected after AI review. Your code looks secure!'
        : `Found ${findings.length} potential issue${findings.length > 1 ? 's' : ''}: ${critical} critical, ${warnings} warning${warnings !== 1 ? 's' : ''}, ${info} informational.`,
      scannedCategories: THREAT_VECTORS.length,
    });
  } catch (err: any) {
    console.error('❌ Audit failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
