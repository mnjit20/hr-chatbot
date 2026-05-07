import type { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { ZodError } from 'zod';

import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger';

const log = logger.child({ module: 'errorHandler' });

export function errorHandler(
  error: FastifyError | Error,
  req: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof AppError) {
    log.warn({ code: error.code, path: req.url, statusCode: error.statusCode }, error.message);
    void reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
    });
    return;
  }

  if (error instanceof ZodError) {
    log.warn({ path: req.url, issues: error.issues }, 'Validation error');
    void reply.status(400).send({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.errors,
    });
    return;
  }

  // Fastify validation errors (schema-level)
  if ('statusCode' in error && error.statusCode === 400) {
    void reply.status(400).send({
      error: error.message,
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  log.error({ error, path: req.url }, 'Unhandled error');
  void reply.status(500).send({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
