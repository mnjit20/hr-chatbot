import type { ILLMService } from '../../domain/llm/ILLMService';
import { EMBEDDING_BATCH_SIZE } from '../../config/constants';
import { logger } from '../../shared/logger';

const log = logger.child({ module: 'EmbeddingService' });

export class EmbeddingService {
  constructor(private readonly llm: ILLMService) {}

  async embed(text: string): Promise<number[]> {
    return this.llm.embed(text);
  }

  /**
   * Embeds texts in batches to respect API rate limits.
   * Processes EMBEDDING_BATCH_SIZE items concurrently per batch.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
      log.debug({ batchSize: batch.length, offset: i }, 'Embedding batch');

      const batchResults = await Promise.all(batch.map((t) => this.llm.embed(t)));
      results.push(...batchResults);
    }

    return results;
  }
}
