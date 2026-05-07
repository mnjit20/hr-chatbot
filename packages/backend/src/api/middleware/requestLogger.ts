import type { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../shared/logger';

const log = logger.child({ module: 'http' });

export function onRequest(req: FastifyRequest, _reply: FastifyReply, done: () => void): void {
  log.info({ method: req.method, url: req.url }, 'Incoming request');
  done();
}

export function onResponse(req: FastifyRequest, reply: FastifyReply, done: () => void): void {
  log.info(
    { method: req.method, url: req.url, statusCode: reply.statusCode },
    'Request complete',
  );
  done();
}
