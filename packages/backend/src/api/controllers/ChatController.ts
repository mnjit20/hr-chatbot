import type { FastifyRequest, FastifyReply } from 'fastify';

import type { IChatOrchestrator } from '../../domain/chat/IChatOrchestrator';
import type { ChatRequest } from '../../domain/chat/ChatMessage';
import { ChatRequestBodySchema } from '../schemas/chat.schema';
import { logger } from '../../shared/logger';

const log = logger.child({ module: 'ChatController' });

/**
 * Thin HTTP adapter. Responsibilities:
 *  1. Parse + validate request body
 *  2. Call the use-case (orchestrator)
 *  3. Write SSE events to the response stream
 *
 * Zero business logic lives here.
 */
export class ChatController {
  constructor(private readonly orchestrator: IChatOrchestrator) {}

  async streamChat(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = ChatRequestBodySchema.parse(req.body);

    const chatRequest: ChatRequest = {
      message: body.message,
      history: body.history,
      sessionId: body.sessionId ?? crypto.randomUUID(),
      employeeId: body.employeeId,
    };

    // Set SSE headers
    void reply.raw.setHeader('Content-Type', 'text/event-stream');
    void reply.raw.setHeader('Cache-Control', 'no-cache');
    void reply.raw.setHeader('Connection', 'keep-alive');
    void reply.raw.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    reply.raw.flushHeaders();

    log.debug({ sessionId: chatRequest.sessionId }, 'Starting SSE stream');

    try {
      for await (const event of this.orchestrator.chat(chatRequest)) {
        const data = JSON.stringify(event);
        reply.raw.write(`data: ${data}\n\n`);
      }
    } catch (error) {
      log.error({ error }, 'Stream error');
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: 'Stream failed' })}\n\n`);
    } finally {
      reply.raw.end();
    }
  }
}
