import { NextRequest, NextResponse } from 'next/server';
import { initEmbedder, embedText, isEmbedderReady } from '@/lib/embedder';
import { vectorStore } from '@/lib/vectorStore';
import { initAI, generateResponse, isAIReady } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Initialize services if they haven't been yet (e.g. after hot reload)
    const hfToken = process.env.HF_TOKEN;
    const groqKey = process.env.GROQ_API_KEY;
    if (!hfToken || !groqKey) {
      return NextResponse.json({ error: 'Missing HF_TOKEN or GROQ_API_KEY in .env.local' }, { status: 500 });
    }
    if (!isEmbedderReady()) initEmbedder(hfToken);
    if (!isAIReady()) initAI(groqKey);

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

    // Return user-friendly error message
    if (err.message?.includes('429') || err.status === 429) {
      return NextResponse.json(
        { error: '⏳ Rate limit hit. Please wait 60 seconds before asking another question.' },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
