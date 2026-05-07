export const CHUNK_SIZE_WORDS = 200;
export const CHUNK_OVERLAP_WORDS = 30;
export const MAX_RETRIEVAL_RESULTS = 5;
export const MAX_TOOL_ITERATIONS = 5;
export const MAX_HISTORY_TURNS = 10;
export const EMBEDDING_BATCH_SIZE = 20;

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];
