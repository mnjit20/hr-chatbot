import type { ParsedDocument, DocumentMetadata } from './Document';

export interface IDocumentParser {
  parse(buffer: Buffer, metadata: DocumentMetadata): Promise<ParsedDocument>;
}
