interface Chunk {
  content: string;
  metadata: {
    file: string;
    language: string;
    startLine: number;
    endLine: number;
    type: string;
  };
}

interface FileInput {
  filename: string;
  content: string;
}

const SUPPORTED_LANGS: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  py: 'python', rb: 'ruby', java: 'java', go: 'go', rs: 'rust',
  cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php', swift: 'swift',
  kt: 'kotlin', vue: 'vue', svelte: 'svelte', html: 'html', css: 'css',
  scss: 'scss', md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
  sql: 'sql', sh: 'shell', bash: 'shell',
};

const BINARY_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf',
  'eot', 'mp3', 'mp4', 'zip', 'tar', 'gz', 'pdf', 'exe', 'dll',
  'lock', 'map',
]);

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return SUPPORTED_LANGS[ext] || 'text';
}

function isBinaryFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return BINARY_EXTS.has(ext);
}

function getBoundaryPatterns(language: string): RegExp[] {
  const common = [
    /^(export\s+)?(async\s+)?function\s+/,
    /^(export\s+)?(default\s+)?class\s+/,
    /^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/,
    /^\/\/ ═/,
    /^\/\*\*/,
  ];
  const extras: Record<string, RegExp[]> = {
    python: [/^(async\s+)?def\s+/, /^class\s+/],
    go: [/^func\s+/, /^type\s+\w+\s+struct/, /^type\s+\w+\s+interface/],
    rust: [/^(pub\s+)?fn\s+/, /^(pub\s+)?struct\s+/, /^impl\s+/],
  };
  return [...common, ...(extras[language] ?? [])];
}

export function chunkCode(content: string, filename: string): Chunk[] {
  const language = detectLanguage(filename);
  const lines = content.split('\n');

  if (lines.length <= 60) {
    return [{ content, metadata: { file: filename, language, startLine: 1, endLine: lines.length, type: 'file' } }];
  }

  const boundaries = getBoundaryPatterns(language);
  const chunks: Chunk[] = [];
  let currentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const isNewBlock = i > currentStart + 5 && boundaries.some(p => p.test(lines[i]));
    if (isNewBlock) {
      const chunkContent = lines.slice(currentStart, i).join('\n').trim();
      if (chunkContent.length > 20) {
        chunks.push({ content: chunkContent, metadata: { file: filename, language, startLine: currentStart + 1, endLine: i, type: 'block' } });
      }
      currentStart = i;
    }
  }

  const last = lines.slice(currentStart).join('\n').trim();
  if (last.length > 20) {
    chunks.push({ content: last, metadata: { file: filename, language, startLine: currentStart + 1, endLine: lines.length, type: 'block' } });
  }

  if (chunks.length === 0) {
    return [{ content, metadata: { file: filename, language, startLine: 1, endLine: lines.length, type: 'file' } }];
  }

  // Split chunks > 150 lines into ~80-line pieces
  return chunks.flatMap(chunk => {
    const cLines = chunk.content.split('\n');
    if (cLines.length <= 150) return [chunk];
    const sub: Chunk[] = [];
    for (let i = 0; i < cLines.length; i += 80) {
      const slice = cLines.slice(i, i + 80);
      sub.push({ content: slice.join('\n'), metadata: { ...chunk.metadata, startLine: chunk.metadata.startLine + i, endLine: chunk.metadata.startLine + i + slice.length - 1 } });
    }
    return sub;
  });
}

export function chunkCodebase(files: FileInput[]): Chunk[] {
  const all: Chunk[] = [];
  for (const f of files) {
    if (isBinaryFile(f.filename)) continue;
    if (f.content.length > 50000) continue;
    all.push(...chunkCode(f.content, f.filename));
  }
  console.log(`📦 Chunked ${files.length} files → ${all.length} chunks`);
  return all;
}
