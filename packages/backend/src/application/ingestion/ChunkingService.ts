import type { DocumentChunk } from '../../domain/document/DocumentChunk';
import type { ParsedDocument } from '../../domain/document/Document';
import { CHUNK_SIZE_WORDS, CHUNK_OVERLAP_WORDS } from '../../config/constants';

function generateId(documentId: string, index: number): string {
  return `${documentId}:chunk:${index}`;
}

/**
 * Splits parsed document text into overlapping chunks for embedding.
 *
 * Strategy: word-based sliding window with overlap.
 * - ~200 words per chunk fits well within embedding model token limits
 * - 30-word overlap preserves context across chunk boundaries
 * - Metadata carries enough info to reconstruct source references
 */
export class ChunkingService {
  chunk(
    document: ParsedDocument,
    chunkSize = CHUNK_SIZE_WORDS,
    overlap = CHUNK_OVERLAP_WORDS,
  ): DocumentChunk[] {
    const words = document.text.split(/\s+/).filter(Boolean);

    if (words.length === 0) return [];

    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      const text = words.slice(start, end).join(' ');

      chunks.push({
        id: generateId(document.metadata.documentId, chunkIndex),
        text,
        metadata: {
          documentId: document.metadata.documentId,
          fileName: document.metadata.fileName,
          chunkIndex,
        },
      });

      chunkIndex++;

      if (end >= words.length) break;
      start += chunkSize - overlap;
    }

    // Stamp totalChunks now that we know it
    return chunks.map((c) => ({
      ...c,
      metadata: { ...c.metadata, totalChunks: chunks.length },
    }));
  }
}
