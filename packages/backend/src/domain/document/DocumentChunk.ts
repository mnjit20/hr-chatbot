export interface ChunkMetadata {
  documentId: string;
  fileName: string;
  chunkIndex: number;
  totalChunks?: number;
}

export interface DocumentChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

export interface EmbeddedChunk extends DocumentChunk {
  embedding: number[];
}

export interface ScoredChunk extends EmbeddedChunk {
  score: number;
}
