import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentIngestionService } from './DocumentIngestionService';
import { ChunkingService } from './ChunkingService';
import { ParserRegistry } from '../../infrastructure/parsers/ParserRegistry';
import { TxtParser } from '../../infrastructure/parsers/TxtParser';
import type { DocumentMetadata } from '../../domain/document/Document';
import type { IVectorStore } from '../../domain/document/IVectorStore';
import type { EmbeddingService } from '../../infrastructure/embeddings/OpenAIEmbeddingService';

function makeMeta(overrides: Partial<DocumentMetadata> = {}): DocumentMetadata {
  return {
    documentId: 'doc-123',
    fileName: 'policy.txt',
    mimeType: 'text/plain',
    uploadedAt: new Date(),
    sizeBytes: 500,
    ...overrides,
  };
}

function makeVectorStore(): IVectorStore {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    deleteByDocumentId: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockReturnValue(0),
  };
}

function makeEmbeddingService(): EmbeddingService {
  return {
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    embedBatch: vi.fn().mockImplementation(async (texts: string[]) =>
      texts.map(() => [0.1, 0.2, 0.3]),
    ),
  } as unknown as EmbeddingService;
}

describe('DocumentIngestionService', () => {
  let ingestionService: DocumentIngestionService;
  let vectorStore: IVectorStore;
  let embeddingService: EmbeddingService;

  beforeEach(() => {
    const registry = new ParserRegistry().register('text/plain', new TxtParser());
    const chunkingService = new ChunkingService();
    vectorStore = makeVectorStore();
    embeddingService = makeEmbeddingService();

    ingestionService = new DocumentIngestionService(
      registry,
      chunkingService,
      embeddingService,
      vectorStore,
    );
  });

  it('ingests a document and returns correct result', async () => {
    const text = 'This is HR policy content. '.repeat(20);
    const buffer = Buffer.from(text);
    const meta = makeMeta();

    const result = await ingestionService.ingest(buffer, meta);

    expect(result.documentId).toBe('doc-123');
    expect(result.fileName).toBe('policy.txt');
    expect(result.chunksCreated).toBeGreaterThan(0);
    expect(result.status).toBe('ingested');
  });

  it('calls embedBatch with chunk texts', async () => {
    const text = 'Word '.repeat(500);
    const buffer = Buffer.from(text);

    await ingestionService.ingest(buffer, makeMeta());

    expect(embeddingService.embedBatch).toHaveBeenCalledOnce();
    const callArgs = (embeddingService.embedBatch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string[];
    expect(callArgs.length).toBeGreaterThan(0);
  });

  it('calls vectorStore.upsert with embedded chunks', async () => {
    const text = 'Content word '.repeat(100);
    await ingestionService.ingest(Buffer.from(text), makeMeta());

    expect(vectorStore.upsert).toHaveBeenCalledOnce();
    const chunks = (vectorStore.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0] as { embedding: number[] }[];
    expect(chunks.every((c) => Array.isArray(c.embedding))).toBe(true);
  });

  it('handles empty document gracefully', async () => {
    const buffer = Buffer.from('   ');
    const result = await ingestionService.ingest(buffer, makeMeta());
    expect(result.chunksCreated).toBe(0);
    expect(vectorStore.upsert).not.toHaveBeenCalled();
  });

  it('deletes document chunks from vector store', async () => {
    await ingestionService.delete('doc-123');
    expect(vectorStore.deleteByDocumentId).toHaveBeenCalledWith('doc-123');
  });
});
