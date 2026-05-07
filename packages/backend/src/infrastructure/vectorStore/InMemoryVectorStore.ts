import type { EmbeddedChunk, ScoredChunk } from '../../domain/document/DocumentChunk';
import type { IVectorStore } from '../../domain/document/IVectorStore';
import { logger } from '../../shared/logger';

const log = logger.child({ module: 'InMemoryVectorStore' });

/**
 * In-memory vector store using cosine similarity.
 *
 * Design note: This is intentionally simple. The IVectorStore interface
 * means swapping to Pinecone, pgvector, or Weaviate requires only
 * implementing this interface — zero application layer changes.
 */
export class InMemoryVectorStore implements IVectorStore {
  private readonly chunks: Map<string, EmbeddedChunk> = new Map();

  async upsert(chunks: EmbeddedChunk[]): Promise<void> {
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
    }
    log.info({ total: this.chunks.size, added: chunks.length }, 'Upserted chunks');
  }

  async search(queryEmbedding: number[], topK: number): Promise<ScoredChunk[]> {
    if (this.chunks.size === 0) return [];

    const scored: ScoredChunk[] = [];

    for (const chunk of this.chunks.values()) {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      scored.push({ ...chunk, score });
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    let deleted = 0;
    for (const [id, chunk] of this.chunks.entries()) {
      if (chunk.metadata.documentId === documentId) {
        this.chunks.delete(id);
        deleted++;
      }
    }
    log.info({ documentId, deleted }, 'Deleted chunks for document');
  }

  count(): number {
    return this.chunks.size;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
