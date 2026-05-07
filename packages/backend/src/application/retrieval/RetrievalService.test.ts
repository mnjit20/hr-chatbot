import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetrievalService } from './RetrievalService';
import type { IVectorStore } from '../../domain/document/IVectorStore';
import type { EmbeddingService } from '../../infrastructure/embeddings/OpenAIEmbeddingService';
import type { ScoredChunk } from '../../domain/document/DocumentChunk';

function makeChunk(score: number): ScoredChunk {
  return {
    id: 'chunk-1',
    text: 'Some HR policy text',
    metadata: { documentId: 'doc1', fileName: 'policy.txt', chunkIndex: 0 },
    embedding: [0.1, 0.2],
    score,
  };
}

describe('RetrievalService', () => {
  let service: RetrievalService;
  let mockStore: IVectorStore;
  let mockEmbedding: EmbeddingService;

  beforeEach(() => {
    mockStore = {
      upsert: vi.fn(),
      search: vi.fn().mockResolvedValue([makeChunk(0.9), makeChunk(0.5)]),
      deleteByDocumentId: vi.fn(),
      count: vi.fn().mockReturnValue(10),
    };
    mockEmbedding = {
      embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      embedBatch: vi.fn(),
    } as unknown as EmbeddingService;

    service = new RetrievalService(mockEmbedding, mockStore);
  });

  it('embeds query and searches vector store', async () => {
    const results = await service.retrieve('How many vacation days?');
    expect(mockEmbedding.embed).toHaveBeenCalledWith('How many vacation days?');
    expect(mockStore.search).toHaveBeenCalledWith([0.1, 0.2, 0.3], 5);
    expect(results).toHaveLength(2);
  });

  it('filters out results below minScore threshold', async () => {
    (mockStore.search as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeChunk(0.8),
      makeChunk(0.1), // below default 0.3
    ]);

    const results = await service.retrieve('query', { minScore: 0.3 });
    expect(results).toHaveLength(1);
    expect(results[0]?.score).toBe(0.8);
  });

  it('returns empty array when vector store is empty', async () => {
    (mockStore.count as ReturnType<typeof vi.fn>).mockReturnValue(0);
    const results = await service.retrieve('query');
    expect(results).toHaveLength(0);
    expect(mockEmbedding.embed).not.toHaveBeenCalled();
  });

  it('respects custom topK', async () => {
    await service.retrieve('query', { topK: 3 });
    expect(mockStore.search).toHaveBeenCalledWith(expect.any(Array), 3);
  });
});
