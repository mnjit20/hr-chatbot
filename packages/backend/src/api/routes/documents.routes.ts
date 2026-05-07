import type { FastifyInstance } from 'fastify';
import type { DocumentsController } from '../controllers/DocumentsController';

export function registerDocumentRoutes(
  fastify: FastifyInstance,
  controller: DocumentsController,
): void {
  fastify.post('/api/documents', async (req, reply) => {
    await controller.upload(req, reply);
  });

  fastify.delete<{ Params: { documentId: string } }>(
    '/api/documents/:documentId',
    async (req, reply) => {
      await controller.deleteDocument(req, reply);
    },
  );
}
