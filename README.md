# CodeAtlas

**AI-Powered Codebase Intelligence Platform**

CodeAtlas is a full-stack, AI-powered web application that allows developers to upload an entire codebase—either from their local filesystem or from a public/private GitHub repository—and immediately ask natural language questions about its architecture, logic, and structure.

Instead of traditional keyword searching, CodeAtlas employs a **Retrieval-Augmented Generation (RAG)** pipeline that transforms source code into semantic vector embeddings, stores them in a Postgres-native vector database, and uses Large Language Models (LLMs) to generate context-aware answers grounded exclusively in your actual source files.

---

## 🌟 Key Features

- **Semantic Code Search**: Ask plain English questions and get answers grounded in specific files, with direct line-number citations.
- **GitHub Import (Public & Private)**: One-click import. Seamlessly pulls both public and private repositories using Clerk's GitHub OAuth integration.
- **Security Auditor**: Automated scanning against 6 threat vectors (Secrets, Injection, XSS, Auth, Data Exposure, Insecure Config) with AI-powered false-positive filtering.
- **Air-Gapped Privacy Mode**: Toggle "Privacy Mode" to run all embeddings and AI completions on your local hardware using Ollama (Llama 3 8B), ensuring your code never touches the cloud.
- **Multi-Repository Architecture**: Index multiple codebases and instantly switch between them without colliding context.
- **Shareable Chat Snippets**: Generate a public, read-only URL of a chat session to share architecture explanations with your team.
- **Real-Time Streaming**: Token-by-token generation via Server-Sent Events (SSE) for zero-latency vibes.

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Framework** | Next.js 16.2.2 (App Router + Turbopack) |
| **Language** | TypeScript 5 |
| **Authentication** | Clerk Auth (`@clerk/nextjs` v7) |
| **Vector Database** | Supabase (Postgres + `pgvector` extension) |
| **Embeddings** | HuggingFace `all-MiniLM-L6-v2` |
| **LLM (Cloud)** | Groq SDK → `llama-3.3-70b-versatile` |
| **LLM (Local)** | Ollama → `llama3:8b` |

---

## 🚀 Getting Started

### 1. Prerequisites
You will need accounts/API keys for the following free services:
*   [Clerk](https://clerk.com) (for Authentication)
*   [Supabase](https://supabase.com) (for Vector Database)
*   [HuggingFace](https://huggingface.co) (for Embeddings)
*   [Groq](https://groq.com) (for ultra-fast LLM inference)

### 2. Database Setup (Supabase)
Run the following SQL in your Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE code_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  content TEXT NOT NULL,
  file TEXT NOT NULL,
  language TEXT,
  start_line INTEGER,
  end_line INTEGER,
  embedding VECTOR(384)
);

CREATE TABLE chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE shared_snippets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  repo_name TEXT,
  messages JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Essential RPC function for similarity search
CREATE OR REPLACE FUNCTION match_code_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  p_user_id text,
  p_repo_name text
) RETURNS TABLE (
  id uuid,
  content text,
  file text,
  start_line int,
  end_line int,
  score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    code_chunks.id,
    code_chunks.content,
    code_chunks.file,
    code_chunks.start_line,
    code_chunks.end_line,
    1 - (code_chunks.embedding <=> query_embedding) AS score
  FROM code_chunks
  WHERE code_chunks.user_id = p_user_id AND code_chunks.repo_name = p_repo_name
  AND 1 - (code_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY code_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 3. Environment Variables
Create a `.env.local` file in the root of the project:

```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Services
HF_TOKEN=hf_...
GROQ_API_KEY=gsk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<YOUR_PROJECT_ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

### 4. Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🔒 Private GitHub Repositories Setup
To allow CodeAtlas to import private GitHub repositories, you must configure Clerk:
1. Go to your **Clerk Dashboard** -> **User & Authentication** -> **Social Connections**.
2. Select **GitHub** and switch OFF "Use default shared credentials".
3. Provide your own GitHub OAuth application `Client ID` and `Client Secret`.
4. In the Clerk "Scopes" input box, explicitly type the word **`repo`**.
5. Save settings. When users log in, they will grant CodeAtlas read-access to their private codebases.
