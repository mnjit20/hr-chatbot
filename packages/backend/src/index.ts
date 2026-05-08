import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';

import { config } from './config';
import { RATE_LIMIT } from './config/constants';
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

  // Global rate limiter — individual routes override with tighter limits via config.rateLimit.
  // In production, swap the default in-memory store for Redis so limits are shared across
  // multiple backend instances: pass `redis: new Redis(...)` to the options below.
  await fastify.register(rateLimit, {
    global: true,
    max: RATE_LIMIT.global.max,
    timeWindow: RATE_LIMIT.global.timeWindow,
    // Skip rate limiting in test environment so integration tests aren't affected
    skipOnError: config.nodeEnv === 'test',
    // Key by IP address. In a real app behind a load balancer, use x-forwarded-for
    // (already handled by trustProxy: true set on the Fastify instance above).
    keyGenerator: (req) => req.ip,
    // Match our existing error envelope shape so clients get a consistent format
    errorResponseBuilder: (_req, context) => ({
      error: `Too many requests — please slow down. Try again in ${context.after}.`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: context.after,
    }),
    // Expose standard rate-limit headers so clients can back off gracefully
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
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
