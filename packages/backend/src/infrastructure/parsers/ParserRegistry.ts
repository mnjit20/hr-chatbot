import type { IDocumentParser } from '../../domain/document/IDocumentParser';
import { UnsupportedDocumentTypeError } from '../../shared/errors/AppError';

/**
 * Registry of document parsers keyed by MIME type.
 * New formats are added via register() — no switch statements, no existing code changes.
 * Follows the Open/Closed Principle.
 */
export class ParserRegistry {
  private readonly parsers = new Map<string, IDocumentParser>();

  register(mimeType: string, parser: IDocumentParser): this {
    this.parsers.set(mimeType, parser);
    return this;
  }

  getParser(mimeType: string): IDocumentParser {
    const parser = this.parsers.get(mimeType);
    if (!parser) {
      throw new UnsupportedDocumentTypeError(mimeType);
    }
    return parser;
  }

  supports(mimeType: string): boolean {
    return this.parsers.has(mimeType);
  }

  supportedTypes(): string[] {
    return Array.from(this.parsers.keys());
  }
}
