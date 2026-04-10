import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { chunkCodebase } from '@/lib/chunker';
import { initEmbedder, embedBatch } from '@/lib/embedder';
import { vectorStore } from '@/lib/vectorStore';
import { initAI } from '@/lib/ai';

// Files/dirs to always skip
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '__pycache__',
  '.venv', 'venv', 'vendor', '.cache', 'coverage', '.turbo',
]);

const BINARY_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'bmp',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'mp3', 'mp4', 'avi', 'mov', 'webm',
  'zip', 'tar', 'gz', 'rar', '7z',
  'pdf', 'exe', 'dll', 'so', 'dylib',
  'lock', 'map', 'min.js', 'min.css',
  'pyc', 'pyo', 'class', 'o', 'obj',
]);

const MAX_FILE_SIZE = 500 * 1024; // 500KB per file
const MAX_FILES = 500; // Cap at 500 files to stay within API limits

/**
 * Parse a GitHub URL into owner + repo + optional branch.
 * Supports:
 *   github.com/owner/repo
 *   github.com/owner/repo.git
 *   github.com/owner/repo/tree/main
 *   github.com/owner/repo/tree/feature/branch-name
 */
function parseGitHubUrl(url: string): { owner: string; repo: string; branch: string } | null {
  try {
    const cleaned = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
    const urlObj = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);

    if (!urlObj.hostname.includes('github.com')) return null;

    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1];
    // If URL contains /tree/branchName, extract it
    let branch = 'HEAD'; // HEAD resolves to the default branch
    if (parts[2] === 'tree' && parts.length >= 4) {
      branch = parts.slice(3).join('/');
    }

    return { owner, repo, branch };
  } catch {
    return null;
  }
}

function shouldSkipPath(path: string): boolean {
  const parts = path.split('/');
  // Skip if any directory segment is in the blacklist
  if (parts.some(p => SKIP_DIRS.has(p))) return true;
  // Skip dotfiles/dotdirs (except common config)
  const filename = parts[parts.length - 1];
  if (filename.startsWith('.') && !['tsx', 'ts', 'js', 'jsx', 'py', 'json', 'css', 'html', 'md'].includes(filename.split('.').pop() || '')) {
    // Allow dotfiles with code extensions, skip others like .DS_Store
    if (!filename.includes('.')) return true;
  }
  // Skip binary extensions
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (BINARY_EXTS.has(ext)) return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });

    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'GitHub URL is required' }, { status: 400 });

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GitHub URL. Use format: github.com/owner/repo' }, { status: 400 });
    }

    const { owner, repo, branch } = parsed;
    console.log(`🐙 GitHub Import: ${owner}/${repo} (branch: ${branch})`);

    // Initialize AI services
    const hfToken = process.env.HF_TOKEN;
    const groqKey = process.env.GROQ_API_KEY;
    if (!hfToken || !groqKey) {
      return NextResponse.json({ error: 'Missing HF_TOKEN or GROQ_API_KEY in .env.local' }, { status: 500 });
    }
    initEmbedder(hfToken);
    initAI(groqKey);

    // Step 1: Fetch the full file tree
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const treeRes = await fetch(treeUrl, {
      headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'CodeAtlas' },
    });

    if (!treeRes.ok) {
      const errText = await treeRes.text();
      if (treeRes.status === 404) {
        return NextResponse.json({ error: `Repository not found: ${owner}/${repo}. Make sure it exists and is public.` }, { status: 404 });
      }
      return NextResponse.json({ error: `GitHub API error: ${treeRes.status} ${errText}` }, { status: 502 });
    }

    const treeData = await treeRes.json();
    const allFiles = (treeData.tree || [])
      .filter((item: any) => item.type === 'blob' && !shouldSkipPath(item.path))
      .slice(0, MAX_FILES);

    console.log(`📋 Found ${allFiles.length} eligible files (from ${treeData.tree?.length || 0} total items)`);

    if (allFiles.length === 0) {
      return NextResponse.json({ error: 'No indexable source files found in this repository.' }, { status: 400 });
    }

    // Step 2: Fetch file contents in parallel batches
    const BATCH = 20; // Fetch 20 files at a time to avoid rate limits
    const fileData: { filename: string; content: string }[] = [];
    let skipped = 0;

    for (let i = 0; i < allFiles.length; i += BATCH) {
      const batch = allFiles.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (file: any) => {
          // Use raw.githubusercontent.com for fast content downloads
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
          const res = await fetch(rawUrl, { headers: { 'User-Agent': 'CodeAtlas' } });
          if (!res.ok) throw new Error(`Failed to fetch ${file.path}`);

          const content = await res.text();
          // Skip files that are too large
          if (content.length > MAX_FILE_SIZE) throw new Error('Too large');

          return { filename: file.path, content };
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled') {
          fileData.push(r.value);
        } else {
          skipped++;
        }
      }
    }

    console.log(`✅ Fetched ${fileData.length} files (skipped ${skipped})`);

    if (fileData.length === 0) {
      return NextResponse.json({ error: 'Could not fetch any file contents from this repository.' }, { status: 400 });
    }

    // Step 3: Chunk, embed, store — reusing existing pipeline
    const chunks = chunkCodebase(fileData);
    console.log(`🧩 Chunked into ${chunks.length} chunks`);

    const repoName = `${owner}/${repo}`;

    // Clear previous index for this user AND this specific repo
    console.log(`🗑️ Clearing previous index for ${repoName}...`);
    await vectorStore.clear(userId, repoName);

    // Embed (this is the slow part)
    console.log(`🔢 Starting embedding of ${chunks.length} chunks (5 in parallel)...`);
    const texts = chunks.map((c: any) => `File: ${c.metadata.file}\n${c.content}`);
    const embeddings = await embedBatch(texts);
    
    console.log('💾 Storing in Supabase...');
    await vectorStore.addChunks(userId, repoName, chunks, embeddings);

    const successfulEmbeddings = embeddings.filter((e: any) => e.embedding).length;
    const stats = await vectorStore.getStatus(userId, repoName);

    console.log(`🎉 GitHub import complete: ${fileData.length} files → ${chunks.length} chunks → ${successfulEmbeddings} embeddings`);

    return NextResponse.json({
      success: true,
      repoName: `${owner}/${repo}`,
      stats: {
        filesProcessed: fileData.length,
        filesSkipped: skipped,
        chunksCreated: chunks.length,
        chunksEmbedded: successfulEmbeddings,
        ...stats,
      },
    });
  } catch (err: any) {
    console.error('❌ GitHub import failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
