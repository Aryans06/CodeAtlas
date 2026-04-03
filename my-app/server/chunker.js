// ═══════════════════════════════════════════════════════════
//  CodeAtlas — Code Chunker
//  
//  PURPOSE: Takes a raw code file and splits it into logical
//  "chunks" (functions, classes, blocks) that can be individually
//  embedded and searched.
//
//  WHY NOT SPLIT BY LINES? If you embed an entire 500-line file,
//  search results are too vague. If you split by individual lines,
//  you lose context. Chunks of ~30-150 lines give the best results.
// ═══════════════════════════════════════════════════════════

// Detect language from file extension
function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const langMap = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', java: 'java', go: 'go', rs: 'rust',
    cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php', swift: 'swift',
    kt: 'kotlin', scala: 'scala', vue: 'vue', svelte: 'svelte',
    html: 'html', css: 'css', scss: 'scss', md: 'markdown',
    json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    sql: 'sql', sh: 'shell', bash: 'shell', zsh: 'shell',
  };
  return langMap[ext] || 'text';
}

// ─── The Main Chunking Logic ───
// 
// Strategy: Use regex patterns to find function/class boundaries.
// If a file is small (<60 lines), keep it as one chunk.
// Otherwise, split at logical boundaries.
//
function chunkCode(content, filename) {
  const language = detectLanguage(filename);
  const lines = content.split('\n');

  // Small files → single chunk
  if (lines.length <= 60) {
    return [{
      content: content,
      metadata: {
        file: filename,
        language,
        startLine: 1,
        endLine: lines.length,
        type: 'file',           // whole file
      }
    }];
  }

  // Get boundary patterns based on language
  const boundaries = getBoundaryPattern(language);
  const chunks = [];
  let currentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line starts a new logical block
    const isNewBlock = boundaries.some(pattern => pattern.test(line));

    if (isNewBlock && i > currentStart + 5) {
      // Save the previous chunk (if it has meaningful content)
      const chunkContent = lines.slice(currentStart, i).join('\n').trim();
      if (chunkContent.length > 20) {  // skip tiny fragments
        chunks.push({
          content: chunkContent,
          metadata: {
            file: filename,
            language,
            startLine: currentStart + 1,
            endLine: i,
            type: 'block',
          }
        });
      }
      currentStart = i;
    }
  }

  // Don't forget the last chunk
  const lastChunk = lines.slice(currentStart).join('\n').trim();
  if (lastChunk.length > 20) {
    chunks.push({
      content: lastChunk,
      metadata: {
        file: filename,
        language,
        startLine: currentStart + 1,
        endLine: lines.length,
        type: 'block',
      }
    });
  }

  // If chunking produced nothing useful, fall back to whole file
  if (chunks.length === 0) {
    return [{
      content,
      metadata: { file: filename, language, startLine: 1, endLine: lines.length, type: 'file' }
    }];
  }

  // Split any chunks that are still too large (>150 lines)
  return chunks.flatMap(chunk => {
    const chunkLines = chunk.content.split('\n');
    if (chunkLines.length <= 150) return [chunk];

    // Split large chunks into ~80-line pieces
    const subChunks = [];
    for (let i = 0; i < chunkLines.length; i += 80) {
      const slice = chunkLines.slice(i, i + 80);
      subChunks.push({
        content: slice.join('\n'),
        metadata: {
          ...chunk.metadata,
          startLine: chunk.metadata.startLine + i,
          endLine: chunk.metadata.startLine + i + slice.length - 1,
          type: 'block',
        }
      });
    }
    return subChunks;
  });
}

// ─── Language-Specific Boundary Patterns ───
//
// These regex patterns detect where new logical blocks start.
// When we hit one of these, we "cut" the chunk.
//
function getBoundaryPattern(language) {
  const common = [
    /^(export\s+)?(async\s+)?function\s+/,        // function declarations
    /^(export\s+)?(default\s+)?class\s+/,          // class declarations
    /^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/,// arrow function exports
    /^(export\s+)?const\s+\w+\s*=\s*(async\s+)?function/,
    /^\/\/ ═/,                                      // section comment dividers
    /^\/\*\*/,                                       // JSDoc comments
  ];

  const patterns = {
    python: [
      /^(async\s+)?def\s+/,     // function definition
      /^class\s+/,               // class definition
      /^@\w+/,                   // decorators
      /^# ──/,                   // section comments
    ],
    java: [
      /^\s*(public|private|protected)\s+/,  // method/class declarations
      /^\s*@\w+/,                            // annotations
    ],
    go: [
      /^func\s+/,               // function declarations
      /^type\s+\w+\s+struct/,   // struct definitions
      /^type\s+\w+\s+interface/,// interface definitions
    ],
    rust: [
      /^(pub\s+)?fn\s+/,       // function declarations
      /^(pub\s+)?struct\s+/,   // struct definitions
      /^impl\s+/,               // impl blocks
    ],
  };

  return [...common, ...(patterns[language] || [])];
}

// ─── Process Multiple Files ───
//
// Takes an array of { filename, content } objects
// and returns all chunks from all files.
//
function chunkCodebase(files) {
  const allChunks = [];

  for (const file of files) {
    // Skip binary/non-text files
    if (isBinaryFile(file.filename)) continue;
    // Skip huge files (>50KB — likely generated/minified)
    if (file.content.length > 50000) continue;

    const chunks = chunkCode(file.content, file.filename);
    allChunks.push(...chunks);
  }

  console.log(`📦 Chunked ${files.length} files → ${allChunks.length} chunks`);
  return allChunks;
}

function isBinaryFile(filename) {
  const binaryExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2',
    'ttf', 'eot', 'mp3', 'mp4', 'zip', 'tar', 'gz', 'pdf', 'exe', 'dll',
    'so', 'dylib', 'lock', 'min.js', 'min.css', 'map'];
  return binaryExts.some(ext => filename.endsWith('.' + ext));
}

export { chunkCode, chunkCodebase, detectLanguage };
