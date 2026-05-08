import type { FastifyInstance } from 'fastify';
import type { ChatController } from '../controllers/ChatController';
import { RATE_LIMIT } from '../../config/constants';

export function registerChatRoutes(fastify: FastifyInstance, controller: ChatController): void {
  fastify.post(
    '/api/chat/stream',
    {
      config: {
        // Tighter limit than the global default: each request triggers an LLM call
        // (embedding + completion), which has both latency and cost implications.
        rateLimit: {
          max: RATE_LIMIT.chat.max,
          timeWindow: RATE_LIMIT.chat.timeWindow,
        },
      },
    },
    async (req, reply) => {
      await controller.streamChat(req, reply);
    },
  );
}
