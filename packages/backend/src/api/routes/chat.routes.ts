import type { FastifyInstance } from 'fastify';
import type { ChatController } from '../controllers/ChatController';

export function registerChatRoutes(fastify: FastifyInstance, controller: ChatController): void {
  fastify.post('/api/chat/stream', async (req, reply) => {
    await controller.streamChat(req, reply);
  });
}
