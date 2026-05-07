import type { FastifyRequest, FastifyReply } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';

import type { DocumentIngestionService } from '../../application/ingestion/DocumentIngestionService';
import type { DocumentMetadata } from '../../domain/document/Document';
import { MAX_FILE_SIZE_BYTES } from '../schemas/documents.schema';
import { UnsupportedDocumentTypeError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger';

const log = logger.child({ module: 'DocumentsController' });

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
};

export class DocumentsController {
  constructor(private readonly ingestionService: DocumentIngestionService) {}

  async upload(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = await req.file({
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }) as MultipartFile | undefined;

    if (!data) {
      void reply.status(400).send({ error: 'No file uploaded', code: 'VALIDATION_ERROR' });
      return;
    }

    const fileName = data.filename;
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = data.mimetype || EXTENSION_TO_MIME[ext] || '';

    if (!mimeType || !EXTENSION_TO_MIME[ext]) {
      throw new UnsupportedDocumentTypeError(mimeType || ext);
    }

    const buffer = await data.toBuffer();

    const metadata: DocumentMetadata = {
      documentId: crypto.randomUUID(),
      fileName,
      mimeType,
      uploadedAt: new Date(),
      sizeBytes: buffer.length,
    };

    log.info({ documentId: metadata.documentId, fileName, sizeBytes: buffer.length }, 'Uploading document');

    const result = await this.ingestionService.ingest(buffer, metadata);

    void reply.status(201).send(result);
  }

  async deleteDocument(
    req: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { documentId } = req.params;
    await this.ingestionService.delete(documentId);
    void reply.status(204).send();
  }
}
