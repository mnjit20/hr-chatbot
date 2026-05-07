import type { IDocumentParser } from '../../domain/document/IDocumentParser';
import type { ParsedDocument, DocumentMetadata } from '../../domain/document/Document';
import { DocumentParseError } from '../../shared/errors/AppError';

export class MarkdownParser implements IDocumentParser {
  async parse(buffer: Buffer, metadata: DocumentMetadata): Promise<ParsedDocument> {
    try {
      const raw = buffer.toString('utf-8');
      // Strip Markdown syntax for cleaner embeddings while preserving content.
      // The LLM sees the original Markdown in prompts; this is only for chunking/embedding.
      const text = stripMarkdown(raw);
      return { text, metadata };
    } catch (error) {
      throw new DocumentParseError(metadata.fileName, error);
    }
  }
}

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')           // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')        // bold
    .replace(/\*(.+?)\*/g, '$1')            // italic
    .replace(/`{3}[\s\S]*?`{3}/g, '')       // fenced code blocks
    .replace(/`(.+?)`/g, '$1')             // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')    // links
    .replace(/^[-*+]\s+/gm, '')            // list items
    .replace(/^\d+\.\s+/gm, '')            // ordered list items
    .replace(/^>\s+/gm, '')                // blockquotes
    .replace(/---+/g, '')                  // horizontal rules
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
