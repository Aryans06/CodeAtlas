import { NextRequest, NextResponse } from 'next/server';
import { chunkCodebase } from '@/lib/chunker';
import { embedBatch } from '@/lib/embedder';
import { vectorStore } from '@/lib/vectorStore';
import { indexingState } from '@/lib/state';

// Initialize Gemini services automatically via lib imports

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    vectorStore.clear();
    indexingState.status = 'indexing';
    indexingState.progress = 0;
    indexingState.message = 'Reading files...';

    // Read all file contents
    const fileData: { filename: string; content: string }[] = [];
    for (const file of files) {
      try {
        const text = await file.text();
        fileData.push({ filename: file.name, content: text });
      } catch {
        // skip unreadable files
      }
    }

    console.log(`📁 Received ${fileData.length} files`);
    indexingState.message = `Chunking ${fileData.length} files...`;

    // Chunk the codebase
    const chunks = chunkCodebase(fileData);
    indexingState.total = chunks.length;
    indexingState.message = `Embedding ${chunks.length} chunks...`;

    // Embed
    const texts = chunks.map((c: any) => `File: ${c.metadata.file}\n${c.content}`);
    const embeddings = await embedBatch(texts, (done: number, total: number) => {
      indexingState.progress = done;
      indexingState.total = total;
      indexingState.message = `Embedding chunk ${done}/${total}...`;
    });

    vectorStore.addChunks(chunks, embeddings);

    indexingState.status = 'ready';
    indexingState.progress = chunks.length;
    indexingState.total = chunks.length;
    indexingState.message = `Indexed ${chunks.length} chunks from ${fileData.length} files`;

    const stats = vectorStore.getStats();
    return NextResponse.json({
      success: true,
      stats: {
        filesProcessed: fileData.length,
        chunksCreated: chunks.length,
        chunksEmbedded: embeddings.filter((e: any) => e.embedding).length,
        ...stats,
      },
    });
  } catch (err: any) {
    console.error('❌ Upload failed:', err);
    indexingState.status = 'error';
    indexingState.message = err.message;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
