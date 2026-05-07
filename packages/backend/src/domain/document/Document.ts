export interface DocumentMetadata {
  documentId: string;
  fileName: string;
  mimeType: string;
  uploadedAt: Date;
  sizeBytes: number;
}

export interface ParsedDocument {
  text: string;
  metadata: DocumentMetadata;
}
