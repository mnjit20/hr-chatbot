export const CHUNK_SIZE_WORDS = 200;
export const CHUNK_OVERLAP_WORDS = 30;
export const MAX_RETRIEVAL_RESULTS = 5;
export const MAX_TOOL_ITERATIONS = 5;
export const MAX_HISTORY_TURNS = 10;
export const EMBEDDING_BATCH_SIZE = 20;

// ─── Rate limits ──────────────────────────────────────────────────────────────
// Time windows use @fastify/rate-limit string format: '1 minute', '15 minutes'
export const RATE_LIMIT = {
  // Global fallback — cheap endpoints (health, etc.)
  global: { max: 100, timeWindow: '1 minute' },
  // Chat: each request hits the LLM (expensive). 20 req/min ≈ one every 3 seconds.
  chat: { max: 20, timeWindow: '1 minute' },
  // Upload: triggers parsing + batch embedding (expensive). 10 uploads/min is generous.
  documentUpload: { max: 10, timeWindow: '1 minute' },
  // Delete: cheap, but no reason to allow bursts
  documentDelete: { max: 30, timeWindow: '1 minute' },
} as const;

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];
