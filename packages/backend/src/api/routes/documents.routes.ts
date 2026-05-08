import type { FastifyInstance } from 'fastify';
import type { DocumentsController } from '../controllers/DocumentsController';
import { RATE_LIMIT } from '../../config/constants';

export function registerDocumentRoutes(
  fastify: FastifyInstance,
  controller: DocumentsController,
): void {
  fastify.post(
    '/api/documents',
    {
      config: {
        // Upload triggers parsing + batch embedding — one of the most expensive
        // operations in the system. 10 uploads/minute is already generous.
        rateLimit: {
          max: RATE_LIMIT.documentUpload.max,
          timeWindow: RATE_LIMIT.documentUpload.timeWindow,
        },
      },
    },
    async (req, reply) => {
      await controller.upload(req, reply);
    },
  );

  fastify.delete<{ Params: { documentId: string } }>(
    '/api/documents/:documentId',
    {
      config: {
        rateLimit: {
          max: RATE_LIMIT.documentDelete.max,
          timeWindow: RATE_LIMIT.documentDelete.timeWindow,
        },
      },
    },
    async (req, reply) => {
      await controller.deleteDocument(req, reply);
    },
  );
}
