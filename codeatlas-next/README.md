# CodeAtlas: AI-Powered Codebase Assistant

CodeAtlas is an intelligent development tool that allows you to instantly understand, navigate, and query any codebase. Built natively on **Next.js 14**, it uses a local **Retrieval-Augmented Generation (RAG)** pipeline powered by Google's Gemini API to act as a highly contextual, AI-driven developer companion.

Instead of traditional keyword searching or manually clicking through files, CodeAtlas lets you drop a folder of code into the browser and ask natural language questions (e.g., *"Where is authentication handled?"* or *"Explain how the vector store works"*).

---

## 🚀 How It Works (The RAG Pipeline)

CodeAtlas runs entirely within a unified Next.js application, functioning as both the client interface and the serverless backend.

1. **Upload:** You drag and drop a codebase folder into the browser.
2. **Chunking:** The Next.js API parses the files, ignoring images and binaries. Using language-aware regular expressions, it splits the code into logical "chunks" (like individual functions or classes) ranging from 30 to 150 lines.
3. **Embedding:** It sends these chunks to the Gemini API (`gemini-embedding-001`) to convert each snippet into a high-dimensional mathematical vector representing its semantic meaning.
4. **Vector Storage:** These vectors, alongside the original code, are stored in memory (`vectorStore.ts`).
5. **Semantic Search:** When you ask a question, the AI embeds your question and uses **Cosine Similarity** to instantly find the top 5 most mathematically relevant code chunks.
6. **AI Response:** It pipes your question and those 5 exact code snippets to `gemini-2.0-flash`, which generates a highly accurate answer, referencing specific files and line numbers.

---

## 🧱 Project Architecture & Files

The project follows standard Next.js 14 App Router patterns.

### 🌐 Frontend (React Components)
Located in `/components`, these are fully interactive Client Components handling the user interface:

*   **`ChatPanel.tsx`**
    The central UI surface. Before codebase upload, it displays the landing page (How it Works, Features). After upload, it acts as the primary chat interface, rendering AI responses, parsing markdown, and showing loading indicators.
*   **`Sidebar.tsx`**
    The left-hand tool panel. It takes the flat list of uploaded file paths and recursively builds an interactive, collapsible File Explorer tree (like VS Code), helping you visualize the project structure.
*   **`ContextPanel.tsx`**
    The right-hand panel. When the AI answers a question, this panel dynamically loads the exact source code snippets (the 5 chunks) the AI used to generate its answer, letting you fact-check the model instantly.
*   **`UploadModal.tsx`**
    The drag-and-drop modal. It utilizes HTML5's `<input webkitdirectory>` to let users select entire local folders, previews the file count, and POSTs `FormData` to the server.
*   **`Navbar.tsx` & `AmbientBackground.tsx`**
    Navigation and aesthetics. The navbar handles theme toggling and the global status message. The ambient background leverages a performance-optimized CSS floating orb animation.

### ⚙️ Backend (Next.js App Router & Lib)
The "server" logic is split between Route Handlers (the endpoints) and the shared libraries (`/lib`).

*   **`app/api/upload/route.ts`**
    The POST endpoint that receives the raw files. It calls the chunker, generates the embeddings, saves them to the vector store, and returns the stats.
*   **`app/api/chat/route.ts`**
    The POST endpoint that receives a user's typed question. It handles the vector search and AI response generation.
*   **`lib/chunker.ts`**
    Contains the intelligence to slice raw code strings into meaningful blocks. It detects the programming language by file extension and uses specific Regex boundary patterns to ensure code isn't split mid-function.
*   **`lib/embedder.ts`**
    The integration with Google's Generative AI SDK, specifically using `gemini-embedding-001`. It sequences requests with an artificial delay (`sleep()`) to avoid tripping strict Free Tier rate limits.
*   **`lib/ai.ts`**
    The integration layer for `gemini-2.0-flash`. It constructs the system prompt: encapsulating the relevant Code Chunks and enforcing strict grounding rules so the AI doesn't hallucinate code that doesn't exist.
*   **`lib/vectorStore.ts`**
    A custom TypeScript class that stores the parsed code chunks and their mathematical embeddings in server memory. It includes the math functions to calculate `cosineSimilarity` against user queries.

---

## 🛠️ Stack & Configuration

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Vanilla CSS (`globals.css`) with modular CSS variables enabling identical light/dark themes.
- **Large Payloads:** Configured via `next.config.ts` to allow local file ingestion payloads up to `50mb`, bypassing default Next.js stringency limits.
