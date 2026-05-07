import type { EmbeddedChunk, ScoredChunk } from './DocumentChunk';

export interface IVectorStore {
  upsert(chunks: EmbeddedChunk[]): Promise<void>;
  search(embedding: number[], topK: number): Promise<ScoredChunk[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
  count(): number;
}
