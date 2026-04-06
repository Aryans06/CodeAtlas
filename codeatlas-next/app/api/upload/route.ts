import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { chunkCodebase } from '@/lib/chunker';
import { initEmbedder, embedBatch } from '@/lib/embedder';
import { vectorStore } from '@/lib/vectorStore';
import { initAI } from '@/lib/ai';
import { indexingState } from '@/lib/state';

// Max total size across all uploaded files (in bytes) = 50MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;
// Max individual file size = 500KB (skip oversized single files like lockfiles)
const MAX_FILE_SIZE = 500 * 1024;

// Increase body size limit for this route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });

    // Initialize AI services (idempotent - safe to call multiple times)
    const hfToken = process.env.HF_TOKEN;
    const groqKey = process.env.GROQ_API_KEY;
    if (!hfToken || !groqKey) {
      return NextResponse.json({ error: 'Missing HF_TOKEN or GROQ_API_KEY in .env.local' }, { status: 500 });
    }
    initEmbedder(hfToken);
    initAI(groqKey);

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Failed to parse upload. Files may be too large. Try uploading fewer files.' },
        { status: 413 }
      );
    }

    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    console.log(`📁 Received ${files.length} files from upload`);

    // Remove the old local vectorStore.clear()
    indexingState.status = 'indexing';
    indexingState.progress = 0;
    indexingState.message = 'Reading files...';

    // Read and filter files
    const fileData: { filename: string; content: string }[] = [];
    let totalSize = 0;
    let skipped = 0;

    for (const file of files) {
      // Skip oversized individual files
      if (file.size > MAX_FILE_SIZE) {
        skipped++;
        continue;
      }
      // Stop if the total size budget is exceeded
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        console.warn(`⚠️ Total size limit reached after ${fileData.length} files. Skipping the rest.`);
        break;
      }

      try {
        const text = await file.text();
        // Use webkitRelativePath if available (folder uploads), else just the name
        const filename = (file as any).webkitRelativePath || file.name;
        fileData.push({ filename, content: text });
        totalSize += file.size;
      } catch {
        skipped++;
      }
    }

    console.log(`✅ Read ${fileData.length} files (skipped ${skipped})`);
    indexingState.message = `Chunking ${fileData.length} files...`;

    // Chunk the codebase
    const chunks = chunkCodebase(fileData);
    indexingState.total = chunks.length;
    indexingState.message = `Embedding ${chunks.length} chunks...`;

    // Drop existing vector entries for this user before uploading fresh codebase
    await vectorStore.clear(userId);

    // Embed with retry logic
    const texts = chunks.map((c: any) => `File: ${c.metadata.file}\n${c.content}`);
    const embeddings = await embedBatch(texts, (done: number, total: number) => {
      indexingState.progress = done;
      indexingState.total = total;
      indexingState.message = `Embedding chunk ${done}/${total}...`;
    });

    await vectorStore.addChunks(userId, chunks, embeddings);

    const successfulEmbeddings = embeddings.filter((e: any) => e.embedding).length;
    indexingState.status = 'ready';
    indexingState.progress = chunks.length;
    indexingState.total = chunks.length;
    indexingState.message = `Indexed ${successfulEmbeddings} chunks from ${fileData.length} files`;

    const stats = await vectorStore.getStatus(userId);
    return NextResponse.json({
      success: true,
      stats: {
        filesProcessed: fileData.length,
        filesSkipped: skipped,
        chunksCreated: chunks.length,
        chunksEmbedded: successfulEmbeddings,
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
