// Shared in-memory state for indexing across requests
// In Next.js, this lives in module scope (server-side singleton)
export interface IndexingState {
  status: 'idle' | 'indexing' | 'ready' | 'error';
  progress: number;
  total: number;
  message: string;
}

export const indexingState: IndexingState = {
  status: 'idle',
  progress: 0,
  total: 0,
  message: '',
};
