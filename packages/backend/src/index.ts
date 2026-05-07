import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

import { config } from './config';
import { buildContainer } from './shared/container';
import { registerChatRoutes } from './api/routes/chat.routes';
import { registerDocumentRoutes } from './api/routes/documents.routes';
import { errorHandler } from './api/middleware/errorHandler';
import { onRequest, onResponse } from './api/middleware/requestLogger';
import { logger } from './shared/logger';

const log = logger.child({ module: 'bootstrap' });

async function bootstrap(): Promise<void> {
  const fastify = Fastify({
    logger: false, // we use our own structured logger
    trustProxy: true,
  });

  // ─── Plugins ───────────────────────────────────────────────────────────────
  await fastify.register(cors, {
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB global limit
  });

  // ─── Middleware ────────────────────────────────────────────────────────────
  fastify.addHook('onRequest', onRequest);
  fastify.addHook('onResponse', onResponse);
  fastify.setErrorHandler(errorHandler);

  // ─── Health check ──────────────────────────────────────────────────────────
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  }));

  // ─── Routes ────────────────────────────────────────────────────────────────
  const container = buildContainer(config);
  registerChatRoutes(fastify, container.chatController);
  registerDocumentRoutes(fastify, container.documentsController);

  // ─── Start ─────────────────────────────────────────────────────────────────
  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  log.info({ port: config.port, env: config.nodeEnv }, 'Server started');
}

bootstrap().catch((err) => {
  logger.error({ error: err }, 'Failed to start server');
  process.exit(1);
});
