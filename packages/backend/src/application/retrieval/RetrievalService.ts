import type { IVectorStore } from '../../domain/document/IVectorStore';
import type { ScoredChunk } from '../../domain/document/DocumentChunk';
import type { EmbeddingService } from '../../infrastructure/embeddings/OpenAIEmbeddingService';
import { MAX_RETRIEVAL_RESULTS } from '../../config/constants';
import { logger } from '../../shared/logger';

const log = logger.child({ module: 'RetrievalService' });

export interface RetrievalOptions {
  topK?: number;
  minScore?: number;
}

/**
 * Converts a user query into an embedding and retrieves the most
 * semantically relevant document chunks from the vector store.
 */
export class RetrievalService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: IVectorStore,
  ) {}

  async retrieve(query: string, options: RetrievalOptions = {}): Promise<ScoredChunk[]> {
    const topK = options.topK ?? MAX_RETRIEVAL_RESULTS;
    const minScore = options.minScore ?? 0.3;
    if (this.vectorStore.count() === 0) {
      log.debug('Vector store is empty — skipping retrieval');
      return [];
    }

    log.debug({ query: query.slice(0, 80), topK }, 'Retrieving context');

    const queryEmbedding = await this.embeddingService.embed(query);
    const results = await this.vectorStore.search(queryEmbedding, topK);

    // Filter out low-confidence results to avoid misleading context
    const filtered = results.filter((r) => r.score >= minScore);

    log.debug({ found: results.length, filtered: filtered.length, minScore }, 'Retrieval complete');

    return filtered;
  }
}
