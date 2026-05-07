import { describe, it, expect } from 'vitest';
import { TxtParser } from './TxtParser';
import { MarkdownParser } from './MarkdownParser';
import { ParserRegistry } from './ParserRegistry';
import { UnsupportedDocumentTypeError } from '../../shared/errors/AppError';
import type { DocumentMetadata } from '../../domain/document/Document';

function makeMeta(fileName: string, mimeType: string): DocumentMetadata {
  return {
    documentId: 'test-doc',
    fileName,
    mimeType,
    uploadedAt: new Date(),
    sizeBytes: 100,
  };
}

describe('TxtParser', () => {
  const parser = new TxtParser();

  it('parses plain text buffer', async () => {
    const buffer = Buffer.from('Hello world\nThis is a test.');
    const result = await parser.parse(buffer, makeMeta('test.txt', 'text/plain'));
    expect(result.text).toBe('Hello world\nThis is a test.');
  });

  it('normalizes CRLF to LF', async () => {
    const buffer = Buffer.from('Line 1\r\nLine 2\r\n');
    const result = await parser.parse(buffer, makeMeta('test.txt', 'text/plain'));
    expect(result.text).not.toContain('\r');
  });

  it('preserves document metadata', async () => {
    const meta = makeMeta('policy.txt', 'text/plain');
    const result = await parser.parse(Buffer.from('text'), meta);
    expect(result.metadata.documentId).toBe('test-doc');
    expect(result.metadata.fileName).toBe('policy.txt');
  });
});

describe('MarkdownParser', () => {
  const parser = new MarkdownParser();

  it('strips heading markers', async () => {
    const buffer = Buffer.from('# Main Title\n## Sub-heading\nBody text.');
    const result = await parser.parse(buffer, makeMeta('doc.md', 'text/markdown'));
    expect(result.text).not.toContain('#');
    expect(result.text).toContain('Main Title');
    expect(result.text).toContain('Body text.');
  });

  it('strips bold and italic markers', async () => {
    const buffer = Buffer.from('This is **bold** and *italic* text.');
    const result = await parser.parse(buffer, makeMeta('doc.md', 'text/markdown'));
    expect(result.text).toBe('This is bold and italic text.');
  });

  it('strips list markers', async () => {
    const buffer = Buffer.from('- Item 1\n- Item 2\n1. First\n2. Second');
    const result = await parser.parse(buffer, makeMeta('doc.md', 'text/markdown'));
    expect(result.text).not.toMatch(/^[-*+]\s/m);
    expect(result.text).toContain('Item 1');
  });
});

describe('ParserRegistry', () => {
  it('registers and retrieves a parser', () => {
    const registry = new ParserRegistry();
    const parser = new TxtParser();
    registry.register('text/plain', parser);
    expect(registry.getParser('text/plain')).toBe(parser);
  });

  it('throws UnsupportedDocumentTypeError for unknown mime type', () => {
    const registry = new ParserRegistry();
    expect(() => registry.getParser('application/unknown')).toThrowError(UnsupportedDocumentTypeError);
  });

  it('supports() returns true for registered types', () => {
    const registry = new ParserRegistry();
    registry.register('text/plain', new TxtParser());
    expect(registry.supports('text/plain')).toBe(true);
    expect(registry.supports('application/pdf')).toBe(false);
  });

  it('supports chained registration', () => {
    const registry = new ParserRegistry()
      .register('text/plain', new TxtParser())
      .register('text/markdown', new MarkdownParser());
    expect(registry.supportedTypes()).toHaveLength(2);
  });
});
