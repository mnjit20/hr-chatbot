import pdfParse from 'pdf-parse';

import type { IDocumentParser } from '../../domain/document/IDocumentParser';
import type { ParsedDocument, DocumentMetadata } from '../../domain/document/Document';
import { DocumentParseError } from '../../shared/errors/AppError';

export class PdfParser implements IDocumentParser {
  async parse(buffer: Buffer, metadata: DocumentMetadata): Promise<ParsedDocument> {
    try {
      const result = await pdfParse(buffer);
      const text = result.text
        .replace(/\s+/g, ' ')
        .trim();

      return { text, metadata };
    } catch (error) {
      throw new DocumentParseError(metadata.fileName, error);
    }
  }
}
