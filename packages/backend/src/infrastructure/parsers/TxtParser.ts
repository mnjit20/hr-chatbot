import type { IDocumentParser } from '../../domain/document/IDocumentParser';
import type { ParsedDocument, DocumentMetadata } from '../../domain/document/Document';
import { DocumentParseError } from '../../shared/errors/AppError';

export class TxtParser implements IDocumentParser {
  async parse(buffer: Buffer, metadata: DocumentMetadata): Promise<ParsedDocument> {
    try {
      const text = buffer.toString('utf-8').replace(/\r\n/g, '\n').trim();
      return { text, metadata };
    } catch (error) {
      throw new DocumentParseError(metadata.fileName, error);
    }
  }
}
