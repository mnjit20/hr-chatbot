import { describe, it, expect } from 'vitest';
import { ChunkingService } from './ChunkingService';
import type { ParsedDocument } from '../../domain/document/Document';

function makeDoc(text: string): ParsedDocument {
  return {
    text,
    metadata: {
      documentId: 'doc-1',
      fileName: 'test.txt',
      mimeType: 'text/plain',
      uploadedAt: new Date(),
      sizeBytes: text.length,
    },
  };
}

describe('ChunkingService', () => {
  const service = new ChunkingService();

  it('returns empty array for empty text', () => {
    expect(service.chunk(makeDoc(''))).toHaveLength(0);
    expect(service.chunk(makeDoc('   '))).toHaveLength(0);
  });

  it('produces one chunk for short text', () => {
    const doc = makeDoc('This is a short document.');
    const chunks = service.chunk(doc, 200, 30);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toContain('short document');
  });

  it('produces multiple chunks for long text', () => {
    const words = Array.from({ length: 500 }, (_, i) => `word${i}`).join(' ');
    const chunks = service.chunk(makeDoc(words), 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('chunk text overlap means content from end of one chunk appears in next', () => {
    const words = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');
    const chunks = service.chunk(makeDoc(words), 100, 20);

    const firstChunkLastWords = chunks[0]!.text.split(' ').slice(-20);
    const secondChunkFirstWords = chunks[1]!.text.split(' ').slice(0, 20);

    const overlap = firstChunkLastWords.filter((w) => secondChunkFirstWords.includes(w));
    expect(overlap.length).toBeGreaterThan(0);
  });

  it('all chunks have correct documentId and fileName in metadata', () => {
    const words = 'word '.repeat(300);
    const chunks = service.chunk(makeDoc(words));
    expect(chunks.every((c) => c.metadata.documentId === 'doc-1')).toBe(true);
    expect(chunks.every((c) => c.metadata.fileName === 'test.txt')).toBe(true);
  });

  it('chunk ids are unique', () => {
    const words = 'word '.repeat(500);
    const chunks = service.chunk(makeDoc(words));
    const ids = new Set(chunks.map((c) => c.id));
    expect(ids.size).toBe(chunks.length);
  });

  it('stamps totalChunks on all chunks', () => {
    const words = 'word '.repeat(400);
    const chunks = service.chunk(makeDoc(words), 100, 20);
    const total = chunks.length;
    expect(chunks.every((c) => c.metadata.totalChunks === total)).toBe(true);
  });
});
