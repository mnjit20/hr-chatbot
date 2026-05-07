import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryVectorStore } from './InMemoryVectorStore';
import type { EmbeddedChunk } from '../../domain/document/DocumentChunk';

function makeChunk(id: string, embedding: number[], documentId = 'doc1'): EmbeddedChunk {
  return {
    id,
    text: `Chunk text for ${id}`,
    metadata: { documentId, fileName: 'test.txt', chunkIndex: 0 },
    embedding,
  };
}

describe('InMemoryVectorStore', () => {
  let store: InMemoryVectorStore;

  beforeEach(() => {
    store = new InMemoryVectorStore();
  });

  it('starts empty', () => {
    expect(store.count()).toBe(0);
  });

  it('upserts chunks and returns correct count', async () => {
    const chunks = [
      makeChunk('a', [1, 0, 0]),
      makeChunk('b', [0, 1, 0]),
    ];
    await store.upsert(chunks);
    expect(store.count()).toBe(2);
  });

  it('upsert is idempotent — re-inserting same id replaces it', async () => {
    await store.upsert([makeChunk('a', [1, 0, 0])]);
    await store.upsert([makeChunk('a', [0, 1, 0])]);
    expect(store.count()).toBe(1);
  });

  it('returns empty array when store is empty', async () => {
    const results = await store.search([1, 0, 0], 5);
    expect(results).toHaveLength(0);
  });

  it('returns top-k results sorted by cosine similarity descending', async () => {
    await store.upsert([
      makeChunk('exact', [1, 0, 0]),
      makeChunk('partial', [0.7, 0.3, 0]),
      makeChunk('unrelated', [0, 0, 1]),
    ]);

    const results = await store.search([1, 0, 0], 3);

    expect(results[0]?.id).toBe('exact');
    expect(results[0]?.score).toBeCloseTo(1.0, 5);
    expect(results[1]?.id).toBe('partial');
    expect(results[2]?.id).toBe('unrelated');
  });

  it('respects topK limit', async () => {
    await store.upsert([
      makeChunk('a', [1, 0, 0]),
      makeChunk('b', [0.9, 0.1, 0]),
      makeChunk('c', [0.8, 0.2, 0]),
    ]);
    const results = await store.search([1, 0, 0], 2);
    expect(results).toHaveLength(2);
  });

  it('deletes all chunks for a document', async () => {
    await store.upsert([
      makeChunk('a', [1, 0, 0], 'doc1'),
      makeChunk('b', [0, 1, 0], 'doc1'),
      makeChunk('c', [0, 0, 1], 'doc2'),
    ]);

    await store.deleteByDocumentId('doc1');
    expect(store.count()).toBe(1);

    const results = await store.search([1, 0, 0], 5);
    expect(results.every((r) => r.metadata.documentId === 'doc2')).toBe(true);
  });

  it('handles zero-vector gracefully', async () => {
    await store.upsert([makeChunk('a', [0, 0, 0])]);
    const results = await store.search([1, 0, 0], 5);
    expect(results[0]?.score).toBe(0);
  });
});
