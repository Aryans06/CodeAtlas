import { NextRequest, NextResponse } from 'next/server';
import { embedText } from '@/lib/embedder';
import { vectorStore } from '@/lib/vectorStore';
import { generateResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!vectorStore.isIndexed) {
      return NextResponse.json(
        { error: 'No codebase indexed. Upload files first.' },
        { status: 400 }
      );
    }

    console.log(`\n💬 Question: "${question}"`);

    // Embed the question
    const queryEmbedding = await embedText(question);

    // Search for relevant code chunks
    const results = vectorStore.search(queryEmbedding, 5);
    console.log(
      `🔍 Found ${results.length} chunks (top: ${((results[0]?.score ?? 0) * 100).toFixed(1)}%)`
    );

    // Generate AI response
    const response = await generateResponse(question, results);

    return NextResponse.json({
      answer: response.text,
      sources: response.sources,
    });
  } catch (err: any) {
    console.error('❌ Chat failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
