import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { initEmbedder, embedText, isEmbedderReady } from '@/lib/embedder';
import { vectorStore } from '@/lib/vectorStore';
import { initAI, generateStreamingResponse, isAIReady } from '@/lib/ai';

import { chatHistory } from '@/lib/chatHistory';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });

    const { question, sessionId, isFirstMessage } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (sessionId) {
      await chatHistory.saveMessage(sessionId, 'user', question);
      if (isFirstMessage) {
        await chatHistory.updateSessionTitle(sessionId, question);
      }
    }

    // Initialize services if they haven't been yet (e.g. after hot reload)
    const hfToken = process.env.HF_TOKEN;
    const groqKey = process.env.GROQ_API_KEY;
    if (!hfToken || !groqKey) {
      return NextResponse.json({ error: 'Missing HF_TOKEN or GROQ_API_KEY in .env.local' }, { status: 500 });
    }
    if (!isEmbedderReady()) initEmbedder(hfToken);
    if (!isAIReady()) initAI(groqKey);

    const dbStatus = await vectorStore.getStatus(userId);
    if (!dbStatus.isIndexed) {
      return NextResponse.json(
        { error: 'No codebase indexed. Upload files first.' },
        { status: 400 }
      );
    }

    console.log(`\n💬 Question: "${question}"`);

    // Embed the question
    const queryEmbedding = await embedText(question);

    // Search for relevant code chunks
    const results = await vectorStore.search(userId, queryEmbedding, 5);
    console.log(
      `🔍 Found ${results.length} chunks (top: ${((results[0]?.score ?? 0) * 100).toFixed(1)}%)`
    );

    // Generate streaming AI response
    const { stream: groqStream, sources } = await generateStreamingResponse(question, results);

    // Create a ReadableStream that pipes Groq tokens as Server-Sent Events
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let aiContent = '';
        try {
          for await (const chunk of groqStream) {
            const token = chunk.choices[0]?.delta?.content;
            if (token) {
              aiContent += token;
              const sseData = `data: ${JSON.stringify({ token })}\n\n`;
              controller.enqueue(encoder.encode(sseData));
            }
          }
          // After all tokens are sent, send the sources
          const sourcesEvent = `data: ${JSON.stringify({ sources })}\n\n`;
          controller.enqueue(encoder.encode(sourcesEvent));

          // Signal end of stream
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          
          if (sessionId) {
            await chatHistory.saveMessage(sessionId, 'ai', aiContent, sources);
          }
        } catch (err: any) {
          console.error('❌ Stream error:', err);
          const errorEvent = `data: ${JSON.stringify({ error: err.message })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
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
