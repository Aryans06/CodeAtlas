// ═══════════════════════════════════════════════════════════
//  CodeAtlas — Express API Server
//
//  This is the entry point. It:
//  1. Serves the frontend (Vite dev or static)
//  2. Handles file uploads via POST /api/upload
//  3. Handles chat queries via POST /api/chat
//  4. Orchestrates: chunk → embed → store → search → answer
// ═══════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';

import { chunkCodebase } from './chunker.js';
import { initEmbedder, embedText, embedBatch } from './embedder.js';
import { vectorStore } from './vectorStore.js';
import { initAI, generateResponse } from './ai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // 3001 so it doesn't conflict with Vite on 3000

// ─── Middleware ───
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Multer for file uploads (stores in memory, not disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

// ─── Initialize AI Services ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env file!');
  console.error('   Create a .env file with: GEMINI_API_KEY=your_key_here');
  console.error('   Get your key at: https://aistudio.google.com/apikey');
  process.exit(1);
}

initEmbedder(GEMINI_API_KEY);
initAI(GEMINI_API_KEY);

// Indexing state (for progress tracking)
let indexingState = {
  status: 'idle', // idle | indexing | ready | error
  progress: 0,
  total: 0,
  message: '',
};

// ═══════════════════════════════════════════════════════════
//  API ENDPOINTS
// ═══════════════════════════════════════════════════════════

// ─── POST /api/upload ───
//
// Accepts uploaded files.  The frontend sends files as multipart form data.
// We read the text content, chunk it, embed it, and store it.
//
// This is the full pipeline:
//   files → chunkCodebase() → embedBatch() → vectorStore.addChunks()
//
app.post('/api/upload', upload.array('files', 500), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Clear previous data
    vectorStore.clear();
    indexingState = { status: 'indexing', progress: 0, total: 0, message: 'Reading files...' };

    // Step 1: Read file contents
    const files = req.files.map(f => ({
      filename: f.originalname,
      content: f.buffer.toString('utf-8'),
    }));

    console.log(`\n📁 Received ${files.length} files`);
    indexingState.message = `Chunking ${files.length} files...`;

    // Step 2: Chunk the codebase
    const chunks = chunkCodebase(files);
    indexingState.total = chunks.length;
    indexingState.message = `Embedding ${chunks.length} chunks...`;

    // Step 3: Generate embeddings for all chunks
    const texts = chunks.map(c => {
      // Prefix with file path for better embedding context
      return `File: ${c.metadata.file}\n${c.content}`;
    });

    const embeddings = await embedBatch(texts, (done, total) => {
      indexingState.progress = done;
      indexingState.total = total;
      indexingState.message = `Embedding chunk ${done}/${total}...`;
    });

    // Step 4: Store in vector store
    vectorStore.addChunks(chunks, embeddings);

    indexingState = {
      status: 'ready',
      progress: chunks.length,
      total: chunks.length,
      message: `Indexed ${chunks.length} chunks from ${files.length} files`,
    };

    const stats = vectorStore.getStats();
    res.json({
      success: true,
      stats: {
        filesProcessed: files.length,
        chunksCreated: chunks.length,
        chunksEmbedded: embeddings.filter(e => e.embedding).length,
        ...stats,
      },
    });
  } catch (err) {
    console.error('❌ Upload failed:', err);
    indexingState = { status: 'error', progress: 0, total: 0, message: err.message };
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/chat ───
//
// Accepts a user question, searches for relevant code,
// and returns an AI-generated answer grounded in the code.
//
// Pipeline: question → embedText() → vectorStore.search() → generateResponse()
//
app.post('/api/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!vectorStore.isIndexed) {
      return res.status(400).json({ error: 'No codebase indexed. Upload files first.' });
    }

    console.log(`\n💬 Question: "${question}"`);

    // Step 1: Embed the question
    const queryEmbedding = await embedText(question);

    // Step 2: Search for relevant code chunks
    const results = vectorStore.search(queryEmbedding, 5);
    console.log(`🔍 Found ${results.length} relevant chunks (top score: ${(results[0]?.score * 100).toFixed(1)}%)`);

    // Step 3: Generate AI response
    const response = await generateResponse(question, results);

    res.json({
      answer: response.text,
      sources: response.sources,
    });
  } catch (err) {
    console.error('❌ Chat failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/status ───
//
// Returns the current indexing status (for progress UI).
//
app.get('/api/status', (req, res) => {
  res.json(indexingState);
});

// ─── DELETE /api/codebase ───
//
// Clears all indexed data.
//
app.delete('/api/codebase', (req, res) => {
  vectorStore.clear();
  indexingState = { status: 'idle', progress: 0, total: 0, message: '' };
  res.json({ success: true });
});

// ─── GET /api/stats ───
app.get('/api/stats', (req, res) => {
  res.json(vectorStore.getStats());
});

// ─── Start Server ───
app.listen(PORT, () => {
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  🚀 CodeAtlas API running on port ${PORT}`);
  console.log(`  📡 Endpoints:`);
  console.log(`     POST /api/upload  — Upload codebase`);
  console.log(`     POST /api/chat    — Ask questions`);
  console.log(`     GET  /api/status  — Indexing status`);
  console.log(`═══════════════════════════════════════\n`);
});
