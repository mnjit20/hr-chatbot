import type { IVectorStore } from '../../domain/document/IVectorStore';
import type { IDocumentParser } from '../../domain/document/IDocumentParser';
import type { DocumentMetadata } from '../../domain/document/Document';
import type { EmbeddedChunk } from '../../domain/document/DocumentChunk';
import type { ParserRegistry } from '../../infrastructure/parsers/ParserRegistry';
import type { EmbeddingService } from '../../infrastructure/embeddings/OpenAIEmbeddingService';
import { ChunkingService } from './ChunkingService';
import { logger } from '../../shared/logger';

const log = logger.child({ module: 'DocumentIngestionService' });

export interface IngestionResult {
  documentId: string;
  fileName: string;
  chunksCreated: number;
  status: 'ingested';
}

/**
 * Orchestrates the full document ingestion pipeline:
 * Parse → Chunk → Embed → Store
 *
 * Each step is injected, making it independently testable and swappable.
 */
export class DocumentIngestionService {
  constructor(
    private readonly parserRegistry: ParserRegistry,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStore: IVectorStore,
  ) {}

  async ingest(
    buffer: Buffer,
    metadata: DocumentMetadata,
  ): Promise<IngestionResult> {
    log.info({ documentId: metadata.documentId, fileName: metadata.fileName }, 'Starting ingestion');

    // Step 1: Parse
    const parser = this.parserRegistry.getParser(metadata.mimeType);
    const parsed = await parser.parse(buffer, metadata);
    log.debug({ documentId: metadata.documentId, textLength: parsed.text.length }, 'Parsed document');

    // Step 2: Chunk
    const chunks = this.chunkingService.chunk(parsed);
    log.debug({ documentId: metadata.documentId, chunks: chunks.length }, 'Chunked document');

    if (chunks.length === 0) {
      log.warn({ documentId: metadata.documentId }, 'Document produced no chunks (empty content?)');
      return { documentId: metadata.documentId, fileName: metadata.fileName, chunksCreated: 0, status: 'ingested' };
    }

    // Step 3: Embed (batched)
    const embeddings = await this.embeddingService.embedBatch(chunks.map((c) => c.text));

    // Step 4: Store
    const embeddedChunks: EmbeddedChunk[] = chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i] ?? [],
    }));

    await this.vectorStore.upsert(embeddedChunks);

    log.info({ documentId: metadata.documentId, chunks: chunks.length }, 'Ingestion complete');

    return {
      documentId: metadata.documentId,
      fileName: metadata.fileName,
      chunksCreated: chunks.length,
      status: 'ingested',
    };
  }

  async delete(documentId: string): Promise<void> {
    await this.vectorStore.deleteByDocumentId(documentId);
    log.info({ documentId }, 'Document deleted');
  }
}
